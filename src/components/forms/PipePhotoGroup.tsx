import React, { useState, useEffect } from 'react';
import { Camera, Trash2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { procesarFoto, FotoRegistro, calculateMD5 } from '../../utils/fotoProcessor';
import { savePhotoToStorage, getPhotoFromStorage } from '../../utils/storageManager';
import { fetchPhotoFromDrive } from '../../utils/driveSync';
import FotoAkasoAutomatica from '../FotoAkasoAutomatica';
import { safeLocalStorageGet } from '../../utils/ui';

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

// ─── Componente para mostrar imagen desde IDB si no tiene blobId ─────────────
export const HydratedImage: React.FC<{ foto: any, alt: string, style?: any, fallback?: any }> = ({ foto, alt, style, fallback }) => {
    const [src, setSrc] = useState<string | null>(foto?.blobId || null);
    const [loading, setLoading] = useState(!foto?.blobId && !!foto?.id);

    useEffect(() => {
        if (!foto?.blobId && foto?.id) {
            setLoading(true);
            getPhotoFromStorage(foto.id).then(async p => {
                if (p) {
                    setSrc(p.blob);
                } else if (foto.filename) {
                    const driveBlob = await fetchPhotoFromDrive(foto.filename);
                    if (driveBlob) {
                        setSrc(driveBlob);
                        savePhotoToStorage({
                            id: foto.id,
                            pozoId: foto.idPozo || '',
                            municipio: (window as any).CURRENT_MUNICIPIO || '',
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

// ─── Tarjeta de una sola foto ─────────────────────────────────────────────────
interface SinglePhotoCardProps {
    label: string;
    sublabel: string;
    filename: string;
    pozoId: string;
    categoria: 'General' | 'Interior' | 'Tuberia' | 'Sumidero';
    existingPhoto?: FotoRegistro;
    onAdd: (foto: FotoRegistro) => void;
    onDelete: (id: string) => void;
    onPreview: (photo: FotoRegistro) => void;
    isLocked: boolean;
    accentColor: string;
}

export const SinglePhotoCard: React.FC<SinglePhotoCardProps> = ({
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
            const userStr = safeLocalStorageGet('ut_star_user');
            const inspector = userStr ? userStr.name : 'Desconocido';
            const municipio = (window as any).CURRENT_MUNICIPIO || 'SOPO';
            const md5 = calculateMD5(blob);
            await savePhotoToStorage({
                id: newFoto.id, pozoId, municipio, barrio: 'CATASTRO', filename, blob, md5,
                categoria: 'Tuberia', inspector, timestamp: Date.now(), synced: false
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
                    barrioFlag="CATASTRO"
                />
            </div>

            {existingPhoto ? (
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '16/9', cursor: 'pointer' }}
                    onClick={() => onPreview(existingPhoto)}>
                    <HydratedImage
                        foto={existingPhoto}
                        alt={filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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
                    <Camera size={24} strokeWidth={1} style={{ color: '#444' }} />
                </div>
            )}

            <div style={{ position: 'relative', marginTop: '8px' }}>
                <button style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: done ? '#1a3a2a' : '#1f6feb', border: `1px solid ${done ? '#238636' : '#2d7dd5'}`,
                    padding: '8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                    color: done ? '#3fb950' : 'white', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                    opacity: isLocked ? 0.5 : 1
                }}>
                    <ImageIcon size={14} />
                    {done ? '✓ CAMBIAR' : 'SELECCIONAR'}
                </button>
                {!isLocked && (
                    <input type="file" accept="image/*" onChange={handleCapture}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10, width: '100%' }} />
                )}
            </div>
        </div>
    );
};

// ─── Grupo de Tubería ────────────────────────────────────
export interface PipePhotoGroupProps {
    pozoId: string;
    label: string;
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

export const PipePhotoGroup: React.FC<PipePhotoGroupProps> = ({
    pozoId, label, tipo, diam, mat, isSumidero, photos, onAdd, onDelete, onPreview, isLocked
}) => {
    const accentColors: Record<string, string> = {
        ENTRADA: '#1f6feb',
        SALIDA: '#2ea043',
        SUMIDERO: '#e3b341'
    };
    const accent = accentColors[tipo] || '#888';

    const pipePhotos = photos.filter(p =>
        p.subcategoria === label ||
        p.filename.toUpperCase().includes(`-${label.toUpperCase()}-T`)
    );
    const medPhotos = photos.filter(p =>
        p.subcategoria === `${label}-Z` ||
        p.filename.toUpperCase().includes(`-${label.toUpperCase()}-Z`)
    );
    const diamPhotos = photos.filter(p =>
        p.subcategoria === `${label}-D` ||
        p.filename.toUpperCase().includes(`-${label.toUpperCase()}-D`)
    );
    const bateaPhotos = isSumidero ? photos.filter(p =>
        p.subcategoria === `${label}-B` ||
        p.filename.toUpperCase().includes(`-${label.toUpperCase()}-B`)
    ) : [];

    const pipeFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-T.JPG`;
    const medFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-Z.JPG`;
    const diamFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-D.JPG`;
    const bateaFile = `${pozoId.toUpperCase()}-${label.toUpperCase()}-B.JPG`;

    const donePipe = pipePhotos.length > 0;
    const doneMed = medPhotos.length > 0;
    const doneDiam = diamPhotos.length > 0;
    const doneBatea = !isSumidero || bateaPhotos.length > 0;
    const allDone = donePipe && doneMed && doneDiam && doneBatea;

    const categ: 'Tuberia' | 'Sumidero' = isSumidero ? 'Sumidero' : 'Tuberia';

    return (
        <div style={{ marginBottom: '16px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '8px 12px', borderRadius: '8px', background: '#0d1117', border: `1px solid ${accent}30` }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: allDone ? '#2ea043' : accent, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Fotos {label}
                    </span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: allDone ? '#2ea043' : '#8b949e' }}>
                    {[donePipe, doneMed, doneDiam, ...(isSumidero ? [doneBatea] : [])].filter(Boolean).length}/{isSumidero ? 4 : 3}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '6px' }}>
                <SinglePhotoCard
                    label="📷 Foto Tubería"
                    sublabel={pipeFile}
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
                    label="📐 Cota Z"
                    sublabel={medFile}
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
                <SinglePhotoCard
                    label="📏 Diámetro"
                    sublabel={diamFile}
                    filename={diamFile}
                    pozoId={pozoId}
                    categoria={categ}
                    existingPhoto={diamPhotos[0]}
                    onAdd={onAdd}
                    onDelete={onDelete}
                    onPreview={onPreview}
                    isLocked={isLocked}
                    accentColor={accent}
                />
                {isSumidero && (
                    <SinglePhotoCard
                        label="🪣 Batea"
                        sublabel={bateaFile}
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
        </div>
    );
};
