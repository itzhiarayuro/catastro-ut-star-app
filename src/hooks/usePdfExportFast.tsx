/**
 * usePdfExportFast — versión rápida de usePdfExport.
 *
 * Diferencias vs. usePdfExport (que se deja INTACTO):
 *   1. Las fotos que tienen driveId en Firestore se descargan por lote vía
 *      Cloud Function nueva (fetchDrivePhotoByIds), saltándose GAS.
 *   2. Solo las fotos que NO tienen driveId caen al fallback GAS existente
 *      (fetchPhotoFromDrive). Esto mantiene retrocompatibilidad con fichas
 *      antiguas.
 *   3. Expone progreso granular durante la hidratación.
 *
 * Seguridad / estabilidad:
 *   - No toca usePdfExport.ts, generateFicha.ts, ni GAS_STRICT_SYNC.js.
 *   - Requiere que la Cloud Function fetchDrivePhotoByIds esté desplegada.
 *     Si no lo está, detecta el error y recomienda al usuario usar el botón
 *     clásico (no intenta fallback masivo a GAS — eso ya es el camino lento).
 *
 * Uso:
 *   const { handlePDFFast, pdfLoading, progress } = usePdfExportFast(toast);
 *   <PdfFastButton pozo={ficha} toast={toast} />   // componente listo abajo
 */

import { useState } from "react";
import type { AppState } from "../types/catastro";
import { getPhotoFromStorage, savePhotoToStorage } from "../utils/storageManager";
import { fetchPhotoFromDrive } from "../utils/driveSync";
import { fetchPhotosByDriveIds, FetchPhotosProgress } from "../utils/driveDirect";
import { withConnectivityRetry } from "../utils/connectivity";
import { convertirA9377 } from "../utils/coords";

type FotoLike = {
    id?: string;
    filename?: string;
    driveId?: string;
    blobId?: string;
    categoria?: string;
    [k: string]: any;
};

export interface PdfFastProgress extends FetchPhotosProgress {
    waitingNetwork?: boolean;
    stage:
        | "idle"
        | "collecting"
        | "local-cache"
        | "waiting_connectivity"
        | "drive-batch"
        | "gas-fallback"
        | "generating"
        | "done"
        | "error";
}

const INITIAL_PROGRESS: PdfFastProgress = {
    stage: "idle",
    done: 0,
    total: 0,
    failed: 0,
};

export const usePdfExportFast = (toast: (msg: string) => void) => {
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfDebugLogs, setPdfDebugLogs] = useState<string[] | null>(null);
    const [progress, setProgress] = useState<PdfFastProgress>(INITIAL_PROGRESS);

    const setStage = (stage: PdfFastProgress["stage"]) =>
        setProgress((p) => ({ ...p, stage }));

    const handlePDFFast = async (pozoToExport: AppState) => {
        if (!pozoToExport.id && !pozoToExport.pozo) {
            toast("❌ No hay ficha cargada para exportar");
            return;
        }
        if (pdfLoading) return;

        setPdfLoading(true);
        setProgress({ ...INITIAL_PROGRESS, stage: "collecting" });
        toast("⚡ Preparando fotos (modo rápido)...");

        try {
            const hydratedPozo: any = JSON.parse(JSON.stringify(pozoToExport));

            // 1) Coordenadas UTM (mismo comportamiento que usePdfExport)
            const lat = hydratedPozo.gps?.lat;
            const lng = hydratedPozo.gps?.lng;
            const faltaX =
                typeof hydratedPozo.coordenada_x !== "number" ||
                hydratedPozo.coordenada_x === 0;
            const faltaY =
                typeof hydratedPozo.coordenada_y !== "number" ||
                hydratedPozo.coordenada_y === 0;
            if (lat && lng && (faltaX || faltaY)) {
                const coords = convertirA9377(lat, lng);
                hydratedPozo.coordenada_x = coords.coordenada_x;
                hydratedPozo.coordenada_y = coords.coordenada_y;
            }

            // 2) Recolectar todas las fotos a hidratar (fotoList + fotos marcación)
            const fotosToHydrate: FotoLike[] = [];
            if (Array.isArray(hydratedPozo.fotoList)) {
                for (const f of hydratedPozo.fotoList as FotoLike[]) {
                    if (f && f.id && !f.blobId) fotosToHydrate.push(f);
                }
            }
            if (hydratedPozo.fotos && typeof hydratedPozo.fotos === "object") {
                for (const key of Object.keys(hydratedPozo.fotos)) {
                    const f = hydratedPozo.fotos[key] as FotoLike | undefined;
                    if (f && typeof f === "object" && f.id && !f.blobId) {
                        fotosToHydrate.push(f);
                    }
                }
            }

            if (fotosToHydrate.length === 0) {
                setStage("generating");
            } else {
                // 3) Primero intentar caché IndexedDB local (barato, secuencial está bien)
                setStage("local-cache");
                const pendientes: FotoLike[] = [];
                for (const f of fotosToHydrate) {
                    const stored = await getPhotoFromStorage(f.id as string);
                    if (stored?.blob) {
                        f.blobId = stored.blob;
                    } else {
                        pendientes.push(f);
                    }
                }

                // 4) Separar los que tienen driveId (camino rápido) vs. los que no
                const conDriveId = pendientes.filter((f) => !!f.driveId);
                const sinDriveId = pendientes.filter((f) => !f.driveId && !!f.filename);

                // 5) Camino rápido: batch Drive API
                if (conDriveId.length > 0) {
                    setStage("drive-batch");
                    const ids = conDriveId.map((f) => f.driveId as string);
                    const map = await fetchPhotosByDriveIds(ids, (p) => {
                        if (p.waitingNetwork) {
                            setProgress({ ...p, stage: "waiting_connectivity" });
                            toast("📡 Sin conexión — esperando red para continuar...");
                        } else {
                            setProgress({ ...p, stage: "drive-batch" });
                        }
                    });
                    for (const f of conDriveId) {
                        const blob = map[f.driveId as string];
                        if (blob) {
                            f.blobId = blob;
                            // Persistir en IndexedDB para próximas veces
                            savePhotoToStorage({
                                id: f.id as string,
                                pozoId: hydratedPozo.pozo || "",
                                municipio: hydratedPozo.municipio || "",
                                barrio: hydratedPozo.barrio || "",
                                filename: f.filename || "",
                                blob,
                                categoria: f.categoria || "General",
                                inspector: hydratedPozo.elaboro || "Sistema",
                                timestamp: Date.now(),
                                synced: true,
                            }).catch(() => {});
                        }
                    }
                }

                // 6) Fallback conservador a GAS solo para las que NO tienen driveId
                //    Secuencial — igual que el camino actual, no lo empeoramos.
                const sinResolver = conDriveId.filter((f) => !f.blobId);
                const fallbackSet = [...sinDriveId, ...sinResolver];
                if (fallbackSet.length > 0) {
                    setStage("gas-fallback");
                    toast(`⚠️ ${fallbackSet.length} foto(s) sin driveId, usando GAS (lento)...`);
                    let gasIdx = 0;
                    let gasFailed = 0;
                    for (const f of fallbackSet) {
                        gasIdx++;
                        setProgress({ stage: "gas-fallback", done: gasIdx, total: fallbackSet.length, failed: gasFailed });
                        if (!f.filename) continue;
                        // Retry GAS con backoff + espera de red automática
                        let driveBlob: string | null = null;
                        try {
                            driveBlob = await withConnectivityRetry(
                                () => fetchPhotoFromDrive(f.filename as string, (hydratedPozo.municipio as string) || ''),
                                10, // hasta 10 reconexiones automáticas
                                (status) => {
                                    if (status === "lost" || status === "waiting") {
                                        setProgress({ stage: "waiting_connectivity", done: gasIdx, total: fallbackSet.length, failed: gasFailed, waitingNetwork: true });
                                        if (status === "lost") toast("📡 Sin conexión — esperando red para continuar...");
                                    }
                                    if (status === "restored") {
                                        setProgress({ stage: "gas-fallback", done: gasIdx, total: fallbackSet.length, failed: gasFailed, waitingNetwork: false });
                                        toast("✅ Conexión restaurada — continuando descarga...");
                                    }
                                }
                            );
                        } catch {
                            driveBlob = null;
                        }
                        if (driveBlob) {
                            f.blobId = driveBlob;
                            if (f.id) {
                                savePhotoToStorage({
                                    id: f.id,
                                    pozoId: hydratedPozo.pozo || "",
                                    municipio: hydratedPozo.municipio || "",
                                    barrio: hydratedPozo.barrio || "",
                                    filename: f.filename,
                                    blob: driveBlob,
                                    categoria: f.categoria || "General",
                                    inspector: hydratedPozo.elaboro || "Sistema",
                                    timestamp: Date.now(),
                                    synced: true,
                                }).catch(() => {});
                            }
                        } else {
                            gasFailed++;
                            console.warn(`[usePdfExportFast][MISSING_FILE] no obtenida tras 3 intentos: ${f.filename}`);
                        }
                    }
                    if (gasFailed > 0) {
                        toast(`ℹ️ ${gasFailed} foto(s) no disponibles en Drive — PDF continúa sin ellas`);
                    }
                }
            }

            // 7) Llamar al motor PDF (idéntico a usePdfExport)
            setStage("generating");
            toast("🚀 Generando PDF en la nube...");
            const { getFunctions, httpsCallable } = await import("firebase/functions");
            const functions = getFunctions();
            const generateFichaFn = httpsCallable(functions, "generateFicha", {
                timeout: 300000,
            });

            const result = await generateFichaFn({ pozo: hydratedPozo });
            const { pdfBase64, filename, downloadUrl, debugLogs } =
                result.data as any;

            if (debugLogs && debugLogs.length > 0) setPdfDebugLogs(debugLogs);

            if (pdfBase64) {
                const byteChars = atob(pdfBase64);
                const byteNumbers = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                    byteNumbers[i] = byteChars.charCodeAt(i);
                }
                const blob = new Blob([new Uint8Array(byteNumbers)], {
                    type: "application/pdf",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename || "ficha.pdf";
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.open(url, "_blank");
                toast("✅ PDF listo (modo rápido)");
            } else if (downloadUrl) {
                toast("✅ PDF listo (modo rápido)");
                window.open(downloadUrl, "_blank");
            } else {
                throw new Error("No se recibió el PDF");
            }

            setStage("done");
        } catch (error: any) {
            console.error("[usePdfExportFast] error:", error);
            const errLogs: string[] | undefined =
                error?.details?.debugLogs || error?.debugLogs;
            if (errLogs && errLogs.length > 0) setPdfDebugLogs(errLogs);

            const msg = String(error?.message || error || "");
            const esFnNoDesplegada =
                msg.includes("not-found") ||
                msg.includes("NOT_FOUND") ||
                msg.includes("fetchDrivePhotoByIds");
            if (esFnNoDesplegada) {
                toast(
                    "⚠️ Modo rápido no disponible (función no desplegada). Usa el botón clásico 'Generar PDF flexible'."
                );
            } else {
                toast(`❌ Error: ${msg || "Fallo en modo rápido"}`);
            }
            setStage("error");
        } finally {
            setPdfLoading(false);
        }
    };

    const resetProgress = () => setProgress(INITIAL_PROGRESS);

    return {
        handlePDFFast,
        pdfLoading,
        pdfDebugLogs,
        setPdfDebugLogs,
        progress,
        resetProgress,
    };
};

/**
 * Botón listo para usar. Se puede soltar en cualquier sitio pasándole la ficha.
 * Ejemplo de uso (una sola línea cuando decidas):
 *
 *   import { PdfFastButton } from "../hooks/usePdfExportFast";
 *   <PdfFastButton pozo={fichaActual} toast={toast} />
 */
import React from "react";

export interface PdfFastButtonProps {
    pozo: AppState;
    toast: (msg: string) => void;
    className?: string;
    style?: React.CSSProperties;
    label?: string;
}

export const PdfFastButton: React.FC<PdfFastButtonProps> = ({
    pozo,
    toast,
    className,
    style,
    label,
}) => {
    const { handlePDFFast, pdfLoading, progress } = usePdfExportFast(toast);

    const renderLabel = () => {
        if (!pdfLoading) return label || "⚡ Generar PDF (rápido, experimental)";
        switch (progress.stage) {
            case "collecting":
                return "⚡ Preparando...";
            case "local-cache":
                return "⚡ Leyendo caché local...";
            case "drive-batch":
                return `⚡ Drive ${progress.done}/${progress.total}${
                    progress.failed ? ` (${progress.failed} fallidas)` : ""
                }`;
            case "gas-fallback":
                return `⚡ GAS fallback ${progress.done}/${progress.total}`;
            case "waiting_connectivity":
                return "📡 Sin red — esperando señal...";
            case "generating":
                return "⚡ Generando PDF...";
            case "done":
                return "✅ Listo";
            case "error":
                return "❌ Error";
            default:
                return "⚡ Trabajando...";
        }
    };

    return (
        <button
            type="button"
            onClick={() => handlePDFFast(pozo)}
            disabled={pdfLoading}
            className={className || "px-3 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"}
            style={style}
            title="Modo rápido: descarga fotos directo de Drive (salta GAS)"
        >
            {renderLabel()}
        </button>
    );
};
