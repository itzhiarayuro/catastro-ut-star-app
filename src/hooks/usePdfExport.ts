import { useState } from 'react';
import { AppState } from '../types/catastro';
import { getPhotoFromStorage, savePhotoToStorage } from '../utils/storageManager';
import { fetchPhotoFromDrive } from '../utils/driveSync';
import { convertirA9377 } from '../utils/coords';

// Helper para reintentos con backoff exponencial
async function callWithRetry(
    generateFichaFn: any,
    data: any,
    maxAttempts = 3,
    onRetry: (attempt: number, error: string) => void = () => {}
): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await generateFichaFn(data);
        } catch (error: any) {
            if (attempt === maxAttempts) throw error;
            const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
            onRetry(attempt, error.message || String(error));
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
}

export const usePdfExport = (toast: (msg: string) => void) => {
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfDebugLogs, setPdfDebugLogs] = useState<string[] | null>(null);

    const handlePDF = async (pozoToExport: AppState) => {
        if (!pozoToExport.id && !pozoToExport.pozo) {
            toast("❌ No hay ficha cargada para exportar");
            return;
        }

        if (pdfLoading) return;
        setPdfLoading(true);
        toast("🚀 Conectando con el generador en la nube...");

        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const generateFichaFn = httpsCallable(functions, 'generateFicha', { timeout: 300000 });

            // Hidratar fotos desde IndexedDB antes de enviar
            const hydratedPozo = JSON.parse(JSON.stringify(pozoToExport));

            // Garantizar coordenadas UTM actualizadas
            const lat = hydratedPozo.gps?.lat;
            const lng = hydratedPozo.gps?.lng;
            const faltaX = typeof hydratedPozo.coordenada_x !== 'number' || hydratedPozo.coordenada_x === 0;
            const faltaY = typeof hydratedPozo.coordenada_y !== 'number' || hydratedPozo.coordenada_y === 0;
            if (lat && lng && (faltaX || faltaY)) {
                const coords = convertirA9377(lat, lng);
                hydratedPozo.coordenada_x = coords.coordenada_x;
                hydratedPozo.coordenada_y = coords.coordenada_y;
            }
            
            // 1. Caso: fotoList (Array de Catastro)
            if (hydratedPozo.fotoList && Array.isArray(hydratedPozo.fotoList)) {
                for (const f of hydratedPozo.fotoList) {
                    if (f.id && !f.blobId) {
                        let stored = await getPhotoFromStorage(f.id);
                        if (stored?.blob) {
                            f.blobId = stored.blob;
                        } else if (f.filename) {
                            const driveBlob = await fetchPhotoFromDrive(f.filename, hydratedPozo.municipio);
                            if (driveBlob) {
                                f.blobId = driveBlob;
                                savePhotoToStorage({
                                    id: f.id,
                                    pozoId: hydratedPozo.pozo || '',
                                    municipio: hydratedPozo.municipio || '',
                                    barrio: hydratedPozo.barrio || '',
                                    filename: f.filename,
                                    blob: driveBlob,
                                    categoria: f.categoria || 'General',
                                    inspector: hydratedPozo.elaboro || 'Sistema',
                                    timestamp: Date.now(),
                                    synced: true
                                }).catch(console.error);
                            }
                        }
                    }
                }
            }

            // 2. Caso: fotos (Objeto de Marcaciones)
            if (hydratedPozo.fotos && typeof hydratedPozo.fotos === 'object') {
                for (const key of Object.keys(hydratedPozo.fotos)) {
                    const f = hydratedPozo.fotos[key];
                    if (f && typeof f === 'object' && f.id && !f.blobId) {
                        let stored = await getPhotoFromStorage(f.id);
                        if (stored?.blob) {
                            f.blobId = stored.blob;
                        } else if (f.filename) {
                             const driveBlob = await fetchPhotoFromDrive(f.filename, hydratedPozo.municipio);
                             if (driveBlob) f.blobId = driveBlob;
                        }
                    }
                }
            }

            const result = await callWithRetry(
                generateFichaFn,
                { pozo: hydratedPozo },
                3,
                (attempt, error) => {
                    toast(`⚠️ Intento ${attempt}: reconectando... (${error.split(':')[0]})`);
                    console.warn(`[PDF Retry] Attempt ${attempt}/3 failed:`, error);
                }
            );
            const { pdfBase64, filename, downloadUrl, debugLogs } = result.data as any;

            if (debugLogs && debugLogs.length > 0) {
                setPdfDebugLogs(debugLogs);
            }

            if (pdfBase64) {
                const byteChars = atob(pdfBase64);
                const byteNumbers = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                    byteNumbers[i] = byteChars.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = filename || 'ficha.pdf';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.open(url, '_blank');
                toast("✅ PDF Listo. Descargando...");
            } else if (downloadUrl) {
                toast("✅ PDF Listo. Abriendo...");
                window.open(downloadUrl, '_blank');
            } else {
                throw new Error("No se recibió el PDF");
            }
        } catch (error: any) {
            console.error("Error generando PDF:", error);
            const errLogs: string[] | undefined = error?.details?.debugLogs || error?.debugLogs;
            if (errLogs && errLogs.length > 0) {
                setPdfDebugLogs(errLogs);
            }
            toast(`❌ Error: ${error.message || "Fallo en la nube"}`);
        } finally {
            setPdfLoading(false);
        }
    };

    return { handlePDF, pdfLoading, pdfDebugLogs, setPdfDebugLogs };
};
