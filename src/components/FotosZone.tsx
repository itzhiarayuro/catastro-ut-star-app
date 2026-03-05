import React, { useState, useEffect } from 'react';
import { Camera, Trash2, CheckCircle2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { procesarFoto, FotoRegistro } from '../utils/fotoProcessor';
import { savePhotoToStorage, getHybridModeStatus } from '../utils/storageManager';
import FotoAkasoAutomatica from './FotoAkasoAutomatica';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pipe {
    id: string;
    es: 'ENTRADA' | 'SALIDA' | 'SUMIDERO';
    deA: string;
    diam: string;
    mat: string;
    estado: string;
    cotaZ: string;
    pendiente: string;
    emboq: string;
    unit?: 'mm' | 'in';
    angle?: number;
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
}

// ─── Utilidad de compresión ───────────────────────────────────────────────────
async function compressImageFileToDataUrl(file: File, maxSize = 1600, quality = 0.7): Promise<string> {
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

// ─── Tarjeta de una sola foto ─────────────────────────────────────────────────
interface SinglePhotoCardProps {
    label: string;          // Ej: "S1 · Foto Tubería"
    sublabel: string;       // Ej: "SALIDA · Ø 200mm"
    filename: string;       // Ej: "P007-S1-T.JPG"
    pozoId: string;
    categoria: 'General' | 'Interior' | 'Tuberia' | 'Sumidero';
    existingPhoto?: FotoRegistro;
    onAdd: (foto: FotoRegistro) => void;
    onDelete: (id: string) => void;
    onPreview: (photo: FotoRegistro) => void;
    isLocked: boolean;
    accentColor: string;    // Para el borde izquierdo de color
}

const SinglePhotoCard: React.FC<SinglePhotoCardProps> = ({
    label, sublabel, filename, pozoId, categoria, existingPhoto,
    onAdd, onDelete, onPreview, isLocked, accentColor
}) => {
    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) { alert("⚠️ No hay espacio suficiente."); return; }
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const blob = await compressImageFileToDataUrl(file, 1600, 0.7);
            const newFoto = procesarFoto(filename, pozoId, blob);
            const userStr = localStorage.getItem('ut_star_user');
            const inspector = userStr ? JSON.parse(userStr).name : 'Desconocido';
            const municipio = (window as any).CURRENT_MUNICIPIO || 'Sopó';
            await savePhotoToStorage({
                id: newFoto.id, pozoId, municipio, barrio: '', filename, blob,
                categoria, inspector, timestamp: Date.now(), synced: false
            });
            onAdd({ ...newFoto, blobId: blob });
        } catch (err) {
            console.error(err);
            alert("Error al procesar foto.");
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const done = !!existingPhoto;

    return (
        <div style={{
            background: '#161b22',
            border: `1px solid ${done ? '#238636' : '#30363d'}`,
            borderLeft: `3px solid ${done ? '#2ea043' : accentColor}`,
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '6px',
            position: 'relative'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {done
                            ? <CheckCircle2 size={13} style={{ color: '#2ea043', flexShrink: 0 }} />
                            : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #555', flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: '13px', fontWeight: '700', color: done ? '#58a6ff' : 'white' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginLeft: '19px', marginTop: '1px' }}>{sublabel}</div>
                </div>
                <FotoAkasoAutomatica
                    pozoId={pozoId}
                    filename={filename}
                    categoria={categoria}
                    onSuccess={onAdd}
                />
            </div>

            {/* Preview o placeholder */}
            {existingPhoto ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '16/9', cursor: 'pointer' }}
                    onClick={() => onPreview(existingPhoto)}>
                    <img src={existingPhoto.blobId} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={filename} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', padding: '6px 8px', fontSize: '8px', color: '#8b949e', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {existingPhoto.filename}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(existingPhoto.id); }}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(255,70,70,0.8)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                        <Trash2 size={13} />
                    </button>
                </div>
            ) : (
                <div style={{ aspectRatio: '16/9', background: '#0d1117', border: '1px dashed #30363d', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    <Camera size={30} strokeWidth={1} style={{ color: '#444' }} />
                </div>
            )}

            {/* Botón Seleccionar */}
            <div style={{ position: 'relative', marginTop: '8px' }}>
                <button style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: done ? '#1a3a2a' : '#1f6feb', border: `1px solid ${done ? '#238636' : '#2d7dd5'}`,
                    padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                    color: done ? '#3fb950' : 'white', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                    opacity: isLocked ? 0.5 : 1
                }}>
                    <ImageIcon size={14} />
                    {done ? '✓ CAMBIAR FOTO' : 'SELECCIONAR FOTO'}
                </button>
                {!isLocked && (
                    <input type="file" accept="image/*" onChange={handleCapture}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10, width: '100%' }} />
                )}
            </div>
        </div>
    );
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
}> = ({ label, description, filename, pozoId, tipo, photos, onAdd, onDelete, onPreview, isLocked }) => {
    const last = photos[photos.length - 1];
    const done = photos.length > 0;

    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) { alert("⚠️ No hay espacio suficiente."); return; }
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const blob = await compressImageFileToDataUrl(file, 1600, 0.7);
            const newFoto = procesarFoto(filename, pozoId, blob);
            const userStr = localStorage.getItem('ut_star_user');
            const inspector = userStr ? JSON.parse(userStr).name : 'Desconocido';
            const municipio = (window as any).CURRENT_MUNICIPIO || 'Sopó';
            await savePhotoToStorage({
                id: newFoto.id, pozoId, municipio, barrio: '', filename, blob,
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
            background: '#161b22', border: `1px solid ${done ? '#238636' : '#30363d'}`,
            borderLeft: `3px solid ${done ? '#2ea043' : '#1f6feb'}`,
            borderRadius: '10px', padding: '12px', marginBottom: '6px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {done ? <CheckCircle2 size={13} style={{ color: '#2ea043' }} />
                            : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #555' }} />}
                        <span style={{ fontSize: '13px', fontWeight: '700', color: done ? '#58a6ff' : 'white' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginLeft: '19px' }}>{description}</div>
                </div>
                <FotoAkasoAutomatica pozoId={pozoId} filename={filename} categoria="General" onSuccess={onAdd} />
            </div>

            {last ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '16/9', cursor: 'pointer' }}
                    onClick={() => onPreview(last)}>
                    <img src={last.blobId} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={filename} />
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
                <button style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: done ? '#1a3a2a' : '#1f6feb', border: `1px solid ${done ? '#238636' : '#2d7dd5'}`,
                    padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                    color: done ? '#3fb950' : 'white', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                    opacity: isLocked ? 0.5 : 1
                }}>
                    <ImageIcon size={14} />
                    {done ? '✓ CAMBIAR FOTO' : 'SELECCIONAR FOTO'}
                </button>
                {!isLocked && (
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

// ─── Grupo de Tubería (par: Foto + Medida) ────────────────────────────────────
interface PipePhotoGroupProps {
    pozoId: string;
    label: string;      // "S1", "E2", "SUM1"
    tipo: 'SALIDA' | 'ENTRADA' | 'SUMIDERO';
    diam: string;
    mat: string;
    isSumidero: boolean;
    photos: FotoRegistro[];
    onAdd: (foto: FotoRegistro) => void;
    onDelete: (id: string) => void;
    onPreview: (photo: FotoRegistro) => void;
    isLocked: boolean;
}

const PipePhotoGroup: React.FC<PipePhotoGroupProps> = ({
    pozoId, label, tipo, diam, mat, isSumidero, photos, onAdd, onDelete, onPreview, isLocked
}) => {
    const accentColors: Record<string, string> = {
        ENTRADA: '#1f6feb',
        SALIDA: '#2ea043',
        SUMIDERO: '#e3b341'
    };
    const accent = accentColors[tipo] || '#888';

    // Filtra las fotos de este pipe por su prefijo de filename
    const pipePhotos = photos.filter(p => p.filename.toUpperCase().startsWith(`${pozoId.toUpperCase()}-${label.toUpperCase()}-T`));
    const medPhotos = photos.filter(p => p.filename.toUpperCase().startsWith(`${pozoId.toUpperCase()}-${label.toUpperCase()}-Z`));
    const bateaPhotos = isSumidero ? photos.filter(p => p.filename.toUpperCase().startsWith(`${pozoId.toUpperCase()}-${label.toUpperCase()}-B`)) : [];

    const pipeFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-T.JPG`;
    const medFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-Z.JPG`;
    const bateaFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-B.JPG`;

    const donePipe = pipePhotos.length > 0;
    const doneMed = medPhotos.length > 0;
    const doneBatea = !isSumidero || bateaPhotos.length > 0;
    const allDone = donePipe && doneMed && doneBatea;

    const categ: 'Tuberia' | 'Sumidero' = isSumidero ? 'Sumidero' : 'Tuberia';

    return (
        <div style={{ marginBottom: '16px' }}>
            {/* Header del grupo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '8px 12px', borderRadius: '8px', background: '#0d1117', border: `1px solid ${accent}30` }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: allDone ? '#2ea043' : accent, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {tipo} · {label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#8b949e', marginLeft: '8px', fontFamily: 'monospace' }}>
                        {diam ? `Ø ${diam}${mat ? ` · ${mat}` : ''}` : mat || '—'}
                    </span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: allDone ? '#2ea043' : '#8b949e', background: allDone ? '#1a3a2a' : '#1a1f2e', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${allDone ? '#238636' : '#30363d'}` }}>
                    {[donePipe, doneMed, ...(isSumidero ? [doneBatea] : [])].filter(Boolean).length}/{isSumidero ? 3 : 2} fotos
                </div>
            </div>

            {/* Par de fotos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <SinglePhotoCard
                    label="📷 Foto Tubería"
                    sublabel={`Archivo: ${pipeFile}`}
                    filename={pipeFile}
                    pozoId={pozoId}
                    categoria={categ}
                    existingPhoto={pipePhotos[0]}
                    onAdd={onAdd}
                    onDelete={onDelete}
                    onPreview={onPreview}
                    isLocked={isLocked}
                    accentColor={accent}
                />
                <SinglePhotoCard
                    label="📐 Medida (Cota Z)"
                    sublabel={`Archivo: ${medFile}`}
                    filename={medFile}
                    pozoId={pozoId}
                    categoria={categ}
                    existingPhoto={medPhotos[0]}
                    onAdd={onAdd}
                    onDelete={onDelete}
                    onPreview={onPreview}
                    isLocked={isLocked}
                    accentColor={accent}
                />
            </div>

            {/* Extra: Batea del sumidero */}
            {isSumidero && (
                <SinglePhotoCard
                    label="🪣 Medida Batea (Entrada)"
                    sublabel={`Archivo: ${bateaFile} · Solo para sumideros`}
                    filename={bateaFile}
                    pozoId={pozoId}
                    categoria="Sumidero"
                    existingPhoto={bateaPhotos[0]}
                    onAdd={onAdd}
                    onDelete={onDelete}
                    onPreview={onPreview}
                    isLocked={isLocked}
                    accentColor="#e3b341"
                />
            )}
        </div>
    );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function FotosZone({ pozoId, photos, pipes, sums, onAddPhoto, onDeletePhoto }: FotosZoneProps) {
    const [storageInfo, setStorageInfo] = useState({ mode: 'FULL', info: '' });
    const [previewPhoto, setPreviewPhoto] = useState<FotoRegistro | null>(null);

    useEffect(() => {
        getHybridModeStatus(photos.length).then(setStorageInfo);
    }, [photos.length]);

    const isLocked = storageInfo.mode === 'LOCKED';

    // Separar pipes por tipo, en orden: Salidas primero, luego Entradas, luego Sumideros
    const salidas = pipes.filter(p => p.es === 'SALIDA');
    const entradas = pipes.filter(p => p.es === 'ENTRADA');
    const sumiderosPipe = pipes.filter(p => p.es === 'SUMIDERO');

    // Calcular total de fotos necesarias
    const totalNeeded = (salidas.length + entradas.length) * 2
        + sumiderosPipe.length * 3
        + sums.length * 3
        + 3; // general + tapa + interior
    const totalDone = photos.length;
    const pct = Math.min(100, Math.round((totalDone / Math.max(totalNeeded, 1)) * 100));

    // Fotos generales
    const generalPhotos = photos.filter(p => p.tipo === 'general' || (p.filename.toUpperCase().includes('-P.') && !p.filename.match(/-[ES]\d/i)));
    const tapaPhotos = photos.filter(p => p.tipo === 'tapa' || p.filename.toUpperCase().endsWith('-T.JPG') && !p.filename.match(/-[ES]\d/i));
    const interiorPhotos = photos.filter(p => p.tipo === 'interior' || p.filename.toUpperCase().endsWith('-I.JPG'));

    const pozoUp = pozoId?.toUpperCase() || 'PXXX';

    return (
        <div style={{ width: '100%' }}>
            {/* Encabezado */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: '0 0 4px' }}>Registro Fotográfico</h2>
                <div style={{ fontSize: '10px', color: '#8b949e', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    NOMENCLATURA: {pozoUp}-[ID]-[T|Z|B].JPG
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
                    photos={generalPhotos} onAdd={onAddPhoto} onDelete={onDeletePhoto} onPreview={setPreviewPhoto} isLocked={isLocked} />
                <GenericPhotoCard label="🔲 Tapa Principal" description="Estado y tipo de tapa"
                    filename={`${pozoUp}-T.JPG`} pozoId={pozoId} tipo="tapa"
                    photos={tapaPhotos} onAdd={onAddPhoto} onDelete={onDeletePhoto} onPreview={setPreviewPhoto} isLocked={isLocked} />
                <GenericPhotoCard label="🔦 Vista Interior" description="Cuerpo y fondo del pozo"
                    filename={`${pozoUp}-I.JPG`} pozoId={pozoId} tipo="interior"
                    photos={interiorPhotos} onAdd={onAddPhoto} onDelete={onDeletePhoto} onPreview={setPreviewPhoto} isLocked={isLocked} />
            </div>

            {/* ── Sección: Tuberías ── */}
            <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#30363d' }} />
                    TUBERÍAS · PARES DE FOTOS
                    <div style={{ flex: 1, height: '1px', background: '#30363d' }} />
                </div>

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
                                isLocked={isLocked}
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
                                isLocked={isLocked}
                            />
                        ))}

                        {/* Sumideros registrados como pipes */}
                        {sumiderosPipe.map((p, i) => (
                            <PipePhotoGroup
                                key={p.id}
                                pozoId={pozoId}
                                label={`SUM${i + 1}`}
                                tipo="SUMIDERO"
                                diam={p.diam}
                                mat={p.mat}
                                isSumidero={true}
                                photos={photos}
                                onAdd={onAddPhoto}
                                onDelete={onDeletePhoto}
                                onPreview={setPreviewPhoto}
                                isLocked={isLocked}
                            />
                        ))}

                        {/* Sumideros del array sums */}
                        {sums.map((s, i) => (
                            <PipePhotoGroup
                                key={s.id}
                                pozoId={pozoId}
                                label={`SUM${sumiderosPipe.length + i + 1}`}
                                tipo="SUMIDERO"
                                diam={s.diamTub}
                                mat={s.matTub}
                                isSumidero={true}
                                photos={photos}
                                onAdd={onAddPhoto}
                                onDelete={onDeletePhoto}
                                onPreview={setPreviewPhoto}
                                isLocked={isLocked}
                            />
                        ))}
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
