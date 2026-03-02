import React, { useState, useEffect } from 'react';
import { Camera, Trash2, MapPin, Clock, CloudOff, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { procesarFoto, FotoRegistro, resizeImage } from '../utils/fotoProcessor';
import { savePhotoToStorage, getHybridModeStatus } from '../utils/storageManager';

interface FotosZoneProps {
    pozoId: string;
    photos: FotoRegistro[];
    pipes: any[];
    sums: any[];
    onAddPhoto: (foto: FotoRegistro) => void;
    onDeletePhoto: (id: string) => void;
}

const PhotoThumb: React.FC<{ photo: FotoRegistro; onDelete: (id: string) => void; onClick: () => void }> = ({ photo, onDelete, onClick }) => (
    <div className="relative group w-[100px] h-[100px] shrink-0 cursor-pointer" onClick={onClick}>
        <div className="w-full h-full rounded-xl overflow-hidden border-2 border-[#30363d] group-hover:border-blue-500 transition-all bg-[#0d1117] shadow-lg">
            <img src={photo.blobId} alt={photo.filename} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        </div>
        <button
            onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-1.5 shadow-xl z-20 transition-colors"
        >
            <Trash2 size={12} />
        </button>
        <div className="absolute bottom-1 inset-x-1 bg-black/60 backdrop-blur-sm py-0.5 px-1.5 rounded-md truncate text-[7px] font-mono text-white pointer-events-none border border-white/10">
            {photo.filename}
        </div>
    </div>
);

/**
 * Función utilitaria para comprimir fotos antes de guardar en IndexedDB.
 * Reduce resolución al máximo de 1600px y aplica calidad 0.7 para ahorrar RAM.
 */
async function compressImageFileToDataUrl(file: File, maxSize = 1600, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("No se pudo obtener el contexto del canvas"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Error al generar el Blob de imagen"));
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg', quality);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };

        img.src = objectUrl;
    });
}

const PhotoSection: React.FC<{
    title: string;
    description: string;
    type: FotoRegistro["tipo"];
    pozoId: string;
    photos: FotoRegistro[];
    onAdd: (foto: FotoRegistro) => void;
    onDelete: (id: string) => void;
    indexOptions?: string[]; // New: List of available indices (e.g., ["E1", "S1"])
    allowSumidero?: boolean;
    sumideroOptions?: string[]; // New: List of available sumideros
    isMedicion?: boolean;
    isLocked: boolean;
    onPreview: (photo: FotoRegistro) => void;
}> = ({ title, description, type, pozoId, photos, onAdd, onDelete, indexOptions, allowSumidero, sumideroOptions, isMedicion, isLocked, onPreview }) => {
    const [index, setIndex] = useState(indexOptions?.[0] || "1");
    const [sumidero, setSumidero] = useState("");
    const [medType, setMedType] = useState("AT");
    const [extraType, setExtraType] = useState("T");

    // Reset index if options change
    useEffect(() => {
        if (indexOptions?.length && !indexOptions.includes(index)) {
            setIndex(indexOptions[0]);
        }
    }, [indexOptions]);

    const lastPhoto = photos[photos.length - 1];

    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) {
            alert("⚠️ No hay espacio suficiente en el dispositivo.");
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // COMPRESIÓN CRÍTICA: Convertir archivo original a Data URL optimizado
            const blob = await compressImageFileToDataUrl(file, 1600, 0.7);

            let parts = [pozoId];

            if (isMedicion) {
                parts.push(medType);
            } else if (type === "general") {
                parts.push("P");
            } else if (type === "tapa" || type === "interior") {
                parts.push(type === "tapa" ? "T" : "I");
            } else if (type === "entrada" || type === "salida") {
                parts.push(`${index}-${extraType}`);
            }

            if (sumidero) {
                parts.push(sumidero.toUpperCase().startsWith('SUM') ? sumidero.toUpperCase() : `SUM${sumidero.toUpperCase()}`);
            }

            const filename = `${parts.join('-').toUpperCase()}.JPG`;

            // Usamos el blob comprimido tanto para el estado de React como para IndexedDB
            const newFoto = procesarFoto(filename, pozoId, blob);

            const userStr = localStorage.getItem('ut_star_user');
            const inspector = userStr ? JSON.parse(userStr).name : 'Desconocido';
            const municipio = (window as any).CURRENT_MUNICIPIO || 'Sopó';

            await savePhotoToStorage({
                id: newFoto.id,
                pozoId: pozoId,
                municipio: municipio,
                barrio: '',
                filename: filename,
                blob: blob, // Aquí guardamos el String Base64 COMPRIMIDO
                categoria: newFoto.tipo === 'general' ? 'General' :
                    newFoto.tipo === 'tapa' || newFoto.tipo === 'interior' ? 'Interior' : 'Tuberia',
                inspector: inspector,
                timestamp: Date.now(),
                synced: false
            });

            onAdd({ ...newFoto, blobId: blob });
        } catch (err) {
            console.error("Error al procesar/guardar foto:", err);
            alert("Memoria insuficiente o error al procesar la foto. Intenta cerrar otras apps o liberar espacio.");
        } finally {
            // Limpiamos el input para permitir capturas repetidas
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="premium-photo-card">
            <div className="header">
                <div className="flex flex-col">
                    <h3 className="title">{title}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tight">{description}</p>
                </div>
                {photos.length > 0 && (
                    <span className="status-badge">
                        <CheckCircle2 size={12} /> {photos.length} FOTO{photos.length > 1 ? 'S' : ''}
                    </span>
                )}
            </div>

            <div className="flex gap-2">
                {indexOptions && indexOptions.length > 0 && (
                    <select
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-1 text-blue-400 font-bold"
                        value={index}
                        onChange={(e) => setIndex(e.target.value)}
                    >
                        {indexOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                )}
                {(type === "entrada" || type === "salida" || (indexOptions && indexOptions.some(o => o.startsWith('E') || o.startsWith('S')))) && (
                    <select
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-1 text-orange-400 font-bold"
                        value={extraType}
                        onChange={(e) => setExtraType(e.target.value)}
                    >
                        <option value="T">Tapa (T)</option>
                        <option value="Z">Cota (Z)</option>
                    </select>
                )}
                {isMedicion && (
                    <select
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-1 text-yellow-400 font-bold"
                        value={medType}
                        onChange={(e) => setMedType(e.target.value)}
                    >
                        <option value="AT">AT</option>
                        <option value="Z">Z</option>
                    </select>
                )}
                {allowSumidero && sumideroOptions && sumideroOptions.length > 0 && (
                    <select
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-1 text-white"
                        value={sumidero}
                        onChange={(e) => setSumidero(e.target.value)}
                    >
                        <option value="">Sin Sumidero</option>
                        {sumideroOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                )}
                {allowSumidero && (!sumideroOptions || sumideroOptions.length === 0) && (
                    <input
                        type="text"
                        placeholder="ID Sum..."
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-2 py-1 text-white"
                        value={sumidero}
                        onChange={(e) => setSumidero(e.target.value)}
                    />
                )}
            </div>

            {/* Featured Big Preview */}
            {lastPhoto ? (
                <div className="preview-container" onClick={() => onPreview(lastPhoto)}>
                    <img src={lastPhoto.blobId} className="main-preview" alt="Preview" />
                    <div className="filename-overlay">{lastPhoto.filename}</div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(lastPhoto.id); }}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1.5 shadow-xl transition-all"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            ) : (
                <div className="empty-preview h-32">
                    <Camera size={32} strokeWidth={1.5} opacity={0.3} />
                </div>
            )}

            {/* Premium Capture Button */}
            <button className={`btn-premium-capture ${isLocked ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}>
                <Camera size={16} />
                {lastPhoto ? 'AÑADIR OTRA FOTO' : 'TOMAR FOTO'}
                {!isLocked && (
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCapture}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                )}
            </button>

            {/* Additional Thumbnails */}
            {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-hide">
                    {photos.slice(0, -1).map(p => (
                        <PhotoThumb key={p.id} photo={p} onDelete={onDelete} onClick={() => onPreview(p)} />
                    ))}
                </div>
            )}
        </div>
    );
};

const FotosZone: React.FC<FotosZoneProps> = ({ pozoId, photos, pipes, sums, onAddPhoto, onDeletePhoto }) => {
    const [storageInfo, setStorageInfo] = useState<{ mode: string, info: string }>({ mode: 'FULL', info: '' });
    const [previewPhoto, setPreviewPhoto] = useState<FotoRegistro | null>(null);

    // Generar opciones de tubería basadas en el registro real
    const entradas = pipes.filter(p => p.es === 'ENTRADA');
    const salidas = pipes.filter(p => p.es === 'SALIDA');

    const pipeOptions = [
        ...entradas.map((_, i) => `E${i + 1}`),
        ...salidas.map((_, i) => `S${i + 1}`)
    ];

    const sumOptions = sums.map((s, i) => s.codEsquema || `SUM${i + 1}`);

    useEffect(() => {
        const check = async () => {
            const status = await getHybridModeStatus(photos.length);
            setStorageInfo(status);
        };
        check();
    }, [photos.length]);

    const isLocked = storageInfo.mode === 'LOCKED';

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <Camera className="text-blue-400" size={24} />
                <div>
                    <h2 className="text-lg font-bold">Registro Fotográfico</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Nomenclatura Automática: {pozoId}-...</p>
                </div>
                <button
                    onClick={() => {
                        const intent = "intent://#Intent;scheme=akasoGo;package=com.akaso.go;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.akaso.go;end";
                        window.location.href = intent;
                    }}
                    className="ml-auto flex items-center gap-2 bg-[#FF5722] hover:bg-[#E64A19] text-white text-[10px] font-bold py-1.5 px-3 rounded-full transition-all shadow-lg active:scale-95"
                >
                    <Camera size={14} />
                    Abrir Akaso GO
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PhotoSection
                    title="General / Panorámica"
                    description="Referencia visual del entorno"
                    type="general"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "general")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
                <PhotoSection
                    title="Tapa Principal"
                    description="Vista superior de la tapa"
                    type="tapa"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "tapa")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
                <PhotoSection
                    title="Vista Interior"
                    description="Cuerpo e interior del pozo"
                    type="interior"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "interior")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
                <PhotoSection
                    title="Tuberías (E/S)"
                    description="Detalle de entradas y salidas"
                    type="entrada"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "entrada" || p.tipo === "salida")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    indexOptions={pipeOptions}
                    allowSumidero
                    sumideroOptions={sumOptions}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
                <PhotoSection
                    title="Mediciones (AT/Z)"
                    description="Registro de profundidad"
                    type="medicion"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.esMedicion)}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isMedicion
                    allowSumidero
                    sumideroOptions={sumOptions}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
                <PhotoSection
                    title="Esquema Vertical"
                    description="Dibujo/Corte del pozo"
                    type="esquema"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "esquema")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
                <PhotoSection
                    title="Ubicación General"
                    description="Croquis de localización"
                    type="ubicacion"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "ubicacion")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isLocked={isLocked}
                    onPreview={setPreviewPhoto}
                />
            </div>

            {/* Photo Preview Modal */}
            {previewPhoto && (
                <div
                    className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-300"
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div className="flex justify-between items-center mb-4 pt-2">
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm tracking-tight">{previewPhoto.filename}</span>
                            <span className="text-gray-500 text-[10px] uppercase">{previewPhoto.tipo} · Pozo {pozoId}</span>
                        </div>
                        <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
                            <Trash2 size={24} onClick={() => { onDeletePhoto(previewPhoto.id); setPreviewPhoto(null); }} />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10">
                        <img src={previewPhoto.blobId} className="max-w-full max-h-full object-contain shadow-2xl" alt="Preview" />
                    </div>
                    <p className="text-center text-gray-400 text-[10px] mt-4 uppercase tracking-[0.2em]">Toca el fondo para cerrar</p>
                </div>
            )}

            <div className={`p-3 border rounded-xl flex items-center justify-between transition-all ${isLocked ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                <div className="flex items-center gap-2">
                    {isLocked ? (
                        <>
                            <AlertTriangle size={16} className="text-red-400" />
                            <span className="text-[10px] font-bold text-red-300 uppercase">Modo Texto Forzado (Almacenamiento Lleno)</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={16} className="text-blue-400" />
                            <span className="text-[10px] font-bold text-blue-300 uppercase">Cola Drive Activa (IndexedDB)</span>
                        </>
                    )}
                </div>
                {storageInfo.mode === 'HYBRID' && (
                    <div className="text-[8px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                        Saturación {'>'} 50: Usar PC
                    </div>
                )}
            </div>
            {storageInfo.info && (
                <p className="text-[9px] text-center text-gray-500 italic px-2">{storageInfo.info}</p>
            )}
        </div>
    );
};

export default FotosZone;
