import React, { useState, useEffect } from 'react';
import { Camera, Trash2, CheckCircle2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { procesarFoto, FotoRegistro, calculateMD5 } from '../utils/fotoProcessor';
import { savePhotoToStorage, getHybridModeStatus, getPhotoFromStorage } from '../utils/storageManager';
import { fetchPhotoFromDrive } from '../utils/driveSync';
import FotoAkasoAutomatica from './FotoAkasoAutomatica';
import { safeLocalStorageGet } from '../utils/ui';
import { PipePhotoGroup } from './forms/PipePhotoGroup';
import { normalizePhotoType } from '../utils/photoTypes';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pipe {
    id: string;
    es: 'ENTRADA' | 'SALIDA' | 'SUMIDERO';
    deA: string;
    diam: string;
    mat: string;
    estado: string;
    cotaZ: string;
    emboq: string;
    unit?: 'mm' | 'in';
    angle?: number;
    tipo?: string;
    orden?: number;
}

interface Sumidero {
    id: string;
    tipo: string;
    matRejilla: string;
    matCaja: string;
    hSalida: string;
    hLlegada: string;
    estado: string;
    codEsquema: string;
    diamTub: string;
    matTub: string;
    unitTub?: 'mm' | 'in';
}

interface FotosZoneProps {
    pozoId: string;
    photos: FotoRegistro[];
    pipes: Pipe[];
    sums: Sumidero[];
    onAddPhoto: (foto: FotoRegistro) => void;
    onDeletePhoto: (id: string) => void;
    readOnlyComponents?: boolean;
    estadoPozo?: string;
    municipio: string;
}

// ─── Utilidad de compresión AGRESIVA (para reducir tamaño de blobs en Cloud Function) ───
async function compressImageFileToDataUrl(file: File, maxSize = 800, quality = 0.45): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
            else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error("No ctx")); return; }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error("No blob")); return; }
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = objectUrl;
    });
}

// ─── Componente para mostrar imagen desde IDB si no tiene blobId ─────────────
const HydratedImage: React.FC<{ foto: any, alt: string, style?: any, fallback?: any, municipio: string }> = ({ foto, alt, style, fallback, municipio }) => {
    const [src, setSrc] = useState<string | null>(foto?.blobId || null);
    const [loading, setLoading] = useState(!foto?.blobId && !!foto?.id);

    useEffect(() => {
        if (!foto?.blobId && foto?.id) {
            setLoading(true);
            getPhotoFromStorage(foto.id).then(async p => {
                if (p) {
                    setSrc(p.blob);
                } else if (foto.filename && municipio) {
                    // Fallback: Descargar de Drive si no está en storage local
                    console.log(`[${municipio}] Intentando descargar ${foto.filename} de Drive...`);
                    const driveBlob = await fetchPhotoFromDrive(foto.filename, municipio);
                    if (driveBlob) {
                        setSrc(driveBlob);
                        // Persistir localmente para no repetir descarga
                        savePhotoToStorage({
                            id: foto.id,
                            pozoId: foto.idPozo || '',
                            municipio: municipio,
                            barrio: 'CATASTRO',
                            filename: foto.filename,
                            blob: driveBlob,
                            categoria: foto.categoria || 'General',
                            inspector: 'Sistema',
                            timestamp: Date.now(),
                            synced: true
                        }).catch(err => console.error("Error guardando tras descarga:", err));
                    }
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setSrc(foto?.blobId || null);
            setLoading(false);
        }
    }, [foto?.id, foto?.blobId]);

    if (loading) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}><div className="spinner-small" /></div>;
    if (!src) return fallback || null;
    return <img src={src} alt={alt} style={style} />;
};

// ─── Sección General/Tapa/Interior (una sola foto) ───────────────────────────
const GenericPhotoCard: React.FC<{
    label: string;
    description: string;
    filename: string;
    pozoId: string;
    tipo: FotoRegistro["tipo"];
    photos: FotoRegistro[];
    onAdd: (foto: FotoRegistro) => void;
    onDelete: (id: string) => void;
    onPreview: (photo: FotoRegistro) => void;
    isLocked: boolean;
    disabled?: boolean;
    municipio: string;
}> = ({ label, description, filename, pozoId, tipo, photos, onAdd, onDelete, onPreview, isLocked, disabled, municipio }) => {
    const last = photos[photos.length - 1];
    const done = photos.length > 0;

    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (isLocked) { alert("⚠️ No hay espacio suficiente."); return; }
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const blob = await compressImageFileToDataUrl(file, 1600, 0.7);
            const newFoto = procesarFoto(filename, pozoId, blob);
            const userStr = safeLocalStorageGet('ut_star_user');
            const inspector = userStr ? userStr.name : 'Desconocido';
            const md5 = calculateMD5(blob);
            await savePhotoToStorage({
                id: newFoto.id, pozoId, municipio, barrio: 'CATASTRO', filename, blob, md5,
                categoria: 'General', inspector, timestamp: Date.now(), synced: false
            });
            onAdd({ ...newFoto, blobId: blob });
        } catch (err) {
            console.error(err);
            alert("Error al procesar foto.");
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div style={{
            background: disabled ? '#0d1117' : '#161b22', border: `1px solid ${done ? '#238636' : (disabled ? '#1a1d23' : '#30363d')}`,
            borderLeft: `3px solid ${done ? '#2ea043' : (disabled ? '#444' : '#1f6feb')}`,
            borderRadius: '10px', padding: '12px', marginBottom: '6px',
            opacity: disabled ? 0.6 : 1
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {done ? <CheckCircle2 size={13} style={{ color: '#2ea043' }} />
                            : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #555' }} />}
                        <span style={{ fontSize: '13px', fontWeight: '700', color: done ? '#58a6ff' : 'white' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginLeft: '19px' }}>
                        {disabled ? '🚫 Deshabilitado por Estado de Pozo (Sellado)' : description}
                    </div>
                </div>
                {!disabled && <FotoAkasoAutomatica pozoId={pozoId} filename={filename} categoria="General" onSuccess={onAdd} barrioFlag="CATASTRO" municipio={municipio} />}
            </div>

            {last ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '16/9', cursor: 'pointer' }}
                    onClick={() => onPreview(last)}>
                    <HydratedImage
                        foto={last}
                        alt={filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        municipio={municipio}
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', padding: '6px 8px', fontSize: '8px', color: '#8b949e', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last.filename}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(last.id); }}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(255,70,70,0.8)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        <Trash2 size={13} />
                    </button>
                </div>
            ) : (
                <div style={{ aspectRatio: '16/9', background: '#0d1117', border: '1px dashed #30363d', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    <Camera size={30} strokeWidth={1} style={{ color: '#444' }} />
                </div>
            )}

            <div style={{ position: 'relative', marginTop: '8px' }}>
                <button 
                    disabled={disabled}
                    style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: disabled ? '#21262d' : (done ? '#1a3a2a' : '#1f6feb'), 
                    border: `1px solid ${done ? '#238636' : (disabled ? '#30363d' : '#2d7dd5')}`,
                    padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                    color: disabled ? '#8b949e' : (done ? '#3fb950' : 'white'), 
                    cursor: disabled ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                    opacity: isLocked || disabled ? 0.5 : 1
                }}>
                    <ImageIcon size={14} />
                    {disabled ? 'BLOQUEADO' : (done ? '✓ CAMBIAR FOTO' : 'SELECCIONAR FOTO')}
                </button>
                {!isLocked && !disabled && (
                    <input type="file" accept="image/*" onChange={handleCapture}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10, width: '100%' }} />
                )}
            </div>

            {photos.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '8px', paddingBottom: '4px' }}>
                    {photos.slice(0, -1).map(p => (
                        <div key={p.id} style={{ width: '60px', height: '60px', flexShrink: 0, position: 'relative', cursor: 'pointer' }} onClick={() => onPreview(p)}>
                            <img src={p.blobId} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} alt="" />
                            <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                                style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ff4b2b', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function FotosZone({ pozoId, photos, pipes, sums, onAddPhoto, onDeletePhoto, readOnlyComponents = false, estadoPozo, municipio }: FotosZoneProps) {
    const [storageInfo, setStorageInfo] = useState({ mode: 'FULL', info: '' });
    const [previewPhoto, setPreviewPhoto] = useState<FotoRegistro | null>(null);

    useEffect(() => {
        getHybridModeStatus(photos.length).then(setStorageInfo);
    }, [photos.length]);

    const isLocked = storageInfo.mode === 'LOCKED';

    // Separar pipes por tipo, en orden: Salidas primero, luego Entradas, luego Sumideros
    // Separar pipes por tipo, con normalización robusta de mayúsculas
    const salidas = pipes.filter(p => {
        const orient = (p.es || p.tipo || '').toUpperCase();
        return orient === 'SALIDA' || orient === 'S';
    });
    const entradas = pipes.filter(p => {
        const orient = (p.es || p.tipo || '').toUpperCase();
        return orient === 'ENTRADA' || orient === 'E' || orient === '';
    });
    const sumiderosPipe = pipes.filter(p => {
        const orient = (p.es || p.tipo || '').toUpperCase();
        return orient === 'SUMIDERO' || orient === 'SUM';
    });

    // Calcular total de fotos necesarias
    const maxSumsCount = Math.max(sumiderosPipe.length, sums.length);
    const totalNeeded = (salidas.length + entradas.length) * 3
        + maxSumsCount * 4
        + 3; // general + tapa + interior
    const totalDone = photos.length;
    const pct = Math.min(100, Math.round((totalDone / Math.max(totalNeeded, 1)) * 100));

    // Fotos generales
    const generalPhotos = photos.filter(p => (normalizePhotoType(p.tipo) === 'general' && (!p.categoria || p.categoria === 'PRINCIPAL')) || (p.filename.toUpperCase().includes('-P.') && !p.filename.match(/-(E|S|SUM)\d/i)));
    const tapaPhotos = photos.filter(p => (normalizePhotoType(p.tipo) === 'tapa' && p.categoria === 'PRINCIPAL') || (p.filename.toUpperCase().endsWith('-T.JPG') && !p.filename.match(/-(E|S|SUM)\d/i)));
    const interiorPhotos = photos.filter(p => normalizePhotoType(p.tipo) === 'interior' || p.filename.toUpperCase().endsWith('-I.JPG'));

    const pozoUp = pozoId?.toUpperCase() || 'PXXX';

    return (
        <div style={{ width: '100%' }}>
            {/* Encabezado */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: '0 0 4px' }}>Registro Fotográfico</h2>
                <div style={{ fontSize: '10px', color: '#8b949e', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    NOMENCLATURA: {pozoUp}-[ID]-[T|Z|D|B].JPG
                </div>
                {/* Barra de progreso */}
                <div style={{ marginTop: '12px', background: '#21262d', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: pct === 100 ? '#2ea043' : '#1f6feb', height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#8b949e' }}>{totalDone} fotos tomadas</span>
                    <span style={{ fontSize: '10px', color: pct === 100 ? '#2ea043' : '#8b949e', fontWeight: '700' }}>{pct}% completado</span>
                </div>
            </div>

            {/* ── Sección: Fotos Generales ── */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#30363d' }} />
                    FOTOS GENERALES
                    <div style={{ flex: 1, height: '1px', background: '#30363d' }} />
                </div>
                <GenericPhotoCard label="📸 General / Panorámica" description="Entorno exterior del pozo"
                    filename={`${pozoUp}-P.JPG`} pozoId={pozoId} tipo="general"
                    photos={generalPhotos} onAdd={onAddPhoto} onDelete={onDeletePhoto} onPreview={setPreviewPhoto} isLocked={isLocked}
                    municipio={municipio} />
                <GenericPhotoCard label="🔲 Tapa Principal" description="Estado y tipo de tapa"
                    filename={`${pozoUp}-T.JPG`} pozoId={pozoId} tipo="tapa"
                    photos={tapaPhotos} onAdd={onAddPhoto} onDelete={onDeletePhoto} onPreview={setPreviewPhoto} isLocked={isLocked}
                    municipio={municipio} />
                <GenericPhotoCard label="🔦 Vista Interior" description="Cuerpo y fondo del pozo"
                    filename={`${pozoUp}-I.JPG`} pozoId={pozoId} tipo="interior"
                    disabled={estadoPozo === 'Sellado'}
                    photos={interiorPhotos} onAdd={onAddPhoto} onDelete={onDeletePhoto} onPreview={setPreviewPhoto} isLocked={isLocked}
                    municipio={municipio} />
            </div>

            {/* ── Sección: Tuberías ── */}
            <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#30363d' }} />
                    {readOnlyComponents ? 'GALERÍA DE COMPONENTES' : 'TUBERÍAS · PARES DE FOTOS'}
                    <div style={{ flex: 1, height: '1px', background: '#30363d' }} />
                </div>

                {readOnlyComponents && (
                    <div style={{ background: '#1f6feb15', border: '1px solid #1f6feb30', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '11px', color: '#58a6ff', textAlign: 'center' }}>
                        ℹ️ Las fotos de tuberías y sumideros se capturan en el Paso 4
                    </div>
                )}

                {pipes.length === 0 && sums.length === 0 ? (
                    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#8b949e' }}>
                        <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>Sin tuberías registradas</div>
                        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>Primero define las tuberías en el Paso 4 · Tuberías</div>
                    </div>
                ) : (
                    <>
                        {/* Salidas primero */}
                        {salidas.map((p, i) => (
                            <PipePhotoGroup
                                key={p.id}
                                pozoId={pozoId}
                                label={`S${i + 1}`}
                                tipo="SALIDA"
                                diam={p.diam}
                                mat={p.mat}
                                isSumidero={false}
                                photos={photos}
                                onAdd={onAddPhoto}
                                onDelete={onDeletePhoto}
                                onPreview={setPreviewPhoto}
                                isLocked={isLocked || readOnlyComponents}
                                municipio={municipio}
                            />
                        ))}

                        {/* Luego entradas */}
                        {entradas.map((p, i) => (
                            <PipePhotoGroup
                                key={p.id}
                                pozoId={pozoId}
                                label={`E${i + 1}`}
                                tipo="ENTRADA"
                                diam={p.diam}
                                mat={p.mat}
                                isSumidero={false}
                                photos={photos}
                                onAdd={onAddPhoto}
                                onDelete={onDeletePhoto}
                                onPreview={setPreviewPhoto}
                                isLocked={isLocked || readOnlyComponents}
                                municipio={municipio}
                            />
                        ))}

                        {/* Sumideros unificados (Pipe + Registro) */}
                        {Array.from({ length: maxSumsCount }).map((_, i) => {
                            const p = sumiderosPipe[i];
                            const s = sums[i];
                            const label = `SUM${i + 1}`;
                            const diam = p?.diam || s?.diamTub || '';
                            const mat = p?.mat || s?.matTub || '';

                            return (
                                <PipePhotoGroup
                                    key={p?.id || s?.id || `sum-${i}`}
                                    pozoId={pozoId}
                                    label={label}
                                    tipo="SUMIDERO"
                                    diam={diam}
                                    mat={mat}
                                    isSumidero={true}
                                    photos={photos}
                                    onAdd={onAddPhoto}
                                    onDelete={onDeletePhoto}
                                    onPreview={setPreviewPhoto}
                                    isLocked={isLocked || readOnlyComponents}
                                    municipio={municipio}
                                />
                            );
                        })}
                    </>
                )}
            </div>

            {/* Modal Previsualización */}
            {previewPhoto && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column', padding: '16px' }}
                    onClick={() => setPreviewPhoto(null)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'white', fontWeight: '700', fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{previewPhoto.filename}</span>
                        <button style={{ background: '#da3633', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', marginLeft: '12px' }}
                            onClick={(e) => { e.stopPropagation(); onDeletePhoto(previewPhoto.id); setPreviewPhoto(null); }}>
                            <Trash2 size={20} />
                        </button>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={previewPhoto.blobId} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Preview" />
                    </div>
                    <p style={{ textAlign: 'center', color: '#555', fontSize: '10px', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>Toca para cerrar</p>
                </div>
            )}

            {/* Estado almacenamiento */}
            <div style={{
                marginTop: '20px', padding: '10px 14px', borderRadius: '8px',
                border: `1px solid ${isLocked ? 'rgba(218,54,51,0.3)' : 'rgba(31,111,235,0.2)'}`,
                background: isLocked ? 'rgba(218,54,51,0.05)' : 'rgba(31,111,235,0.05)',
                fontSize: '10px', fontWeight: '700', textAlign: 'center',
                color: isLocked ? '#f85149' : '#58a6ff', textTransform: 'uppercase', letterSpacing: '1px'
            }}>
                {isLocked ? '⚠️ Almacenamiento Lleno · Modo Texto' : '✅ Almacenamiento OK · Sincronización Activa'}
            </div>
        </div>
    );
}
