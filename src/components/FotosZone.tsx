import React, { useState } from 'react';
import { Camera, Trash2, MapPin, Clock, CloudOff, Info, CheckCircle2 } from 'lucide-react';
import { procesarFoto, FotoRegistro } from '../utils/fotoProcessor';

interface FotosZoneProps {
    pozoId: string;
    photos: FotoRegistro[];
    onAddPhoto: (foto: FotoRegistro) => void;
    onDeletePhoto: (id: string) => void;
}

const PhotoThumb: React.FC<{ photo: FotoRegistro; onDelete: (id: string) => void }> = ({ photo, onDelete }) => (
    <div className="relative group w-[80px] h-[80px] shrink-0">
        <div className="w-full h-full rounded-lg overflow-hidden border border-[#30363d] group-hover:border-blue-500 transition-all bg-[#161b22]">
            <img src={photo.blobId} alt={photo.filename} className="w-full h-full object-cover" />
        </div>
        <button
            onClick={() => onDelete(photo.id)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"
        >
            <Trash2 size={10} />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 px-1 truncate text-[8px] font-mono text-white pointer-events-none">
            {photo.filename}
        </div>
    </div>
);

const PhotoSection: React.FC<{
    title: string;
    type: FotoRegistro["tipo"];
    pozoId: string;
    photos: FotoRegistro[];
    onAdd: (foto: FotoRegistro) => void;
    onDelete: (id: string) => void;
    allowIndex?: boolean;
    allowSumidero?: boolean;
    isMedicion?: boolean;
}> = ({ title, type, pozoId, photos, onAdd, onDelete, allowIndex, allowSumidero, isMedicion }) => {
    const [index, setIndex] = useState("1");
    const [subType, setSubType] = useState<"entrada" | "salida" | "sumidero" | "general">(type === "entrada" || type === "salida" || type === "sumidero" ? type : "general");
    const [sumidero, setSumidero] = useState("");
    const [medType, setMedType] = useState("AT");
    const [extraType, setExtraType] = useState("T"); // for T or Z

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const blob = ev.target?.result as string;

            let finalType = type;
            let finalIndex = index;
            let finalExtra: string | undefined = undefined;

            if (isMedicion) {
                finalIndex = medType;
                finalType = "medicion";
                finalExtra = medType;
            } else if (type === "entrada" || type === "salida") {
                finalExtra = extraType;
            }

            const metadata = procesarFoto(pozoId, finalType, finalIndex, sumidero, finalExtra);
            const newFoto: FotoRegistro = {
                ...metadata as FotoRegistro,
                id: `foto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                blobId: blob
            };
            onAdd(newFoto);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</h3>
                <div className="flex gap-2">
                    {allowIndex && (
                        <div className="flex gap-1">
                            <select
                                className="bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-0.5"
                                value={index}
                                onChange={(e) => setIndex(e.target.value)}
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map(i => <option key={i} value={i}>{title === "Tubería" ? `Tub ${i}` : i}</option>)}
                            </select>
                            {(type === "entrada" || type === "salida") && (
                                <select
                                    className="bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-0.5"
                                    value={extraType}
                                    onChange={(e) => setExtraType(e.target.value)}
                                >
                                    <option value="T">Tapa</option>
                                    <option value="Z">Cota</option>
                                </select>
                            )}
                        </div>
                    )}
                    {isMedicion && (
                        <select
                            className="bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-1 py-0.5"
                            value={medType}
                            onChange={(e) => setMedType(e.target.value)}
                        >
                            <option value="AT">AT</option>
                            <option value="Z">Z</option>
                        </select>
                    )}
                    {allowSumidero && (
                        <input
                            type="text"
                            placeholder="Sum1"
                            className="bg-[#0d1117] border border-[#30363d] rounded text-[10px] px-2 py-0.5 w-16"
                            value={sumidero}
                            onChange={(e) => setSumidero(e.target.value)}
                        />
                    )}
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="photo-zone relative shrink-0 !w-[80px] !h-[80px] border-2 border-dashed border-[#30363d] hover:border-blue-500 bg-[#0d1117]">
                    <Camera size={20} className="text-gray-500 mb-1" />
                    <span className="text-[8px] font-bold uppercase text-gray-600">Captura</span>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCapture}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                </div>
                {photos.map(p => (
                    <PhotoThumb key={p.id} photo={p} onDelete={onDelete} />
                ))}
            </div>
        </div>
    );
};

const FotosZone: React.FC<FotosZoneProps> = ({ pozoId, photos, onAddPhoto, onDeletePhoto }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <Camera className="text-blue-400" size={24} />
                <div>
                    <h2 className="text-lg font-bold">Registro Fotográfico</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Nomenclatura Automática: {pozoId}-...</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PhotoSection
                    title="General / Panorámica"
                    type="general"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "general")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                />
                <PhotoSection
                    title="Tapa / Interior"
                    type="tapa"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "tapa" || p.tipo === "interior")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                />
                <PhotoSection
                    title="Tubería"
                    type="entrada"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.tipo === "entrada" || p.tipo === "salida")}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    allowIndex
                    allowSumidero
                />
                <PhotoSection
                    title="Mediciones (AT/Z)"
                    type="medicion"
                    pozoId={pozoId}
                    photos={photos.filter(p => p.esMedicion)}
                    onAdd={onAddPhoto}
                    onDelete={onDeletePhoto}
                    isMedicion
                    allowSumidero
                />
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-300 uppercase">Cola Drive Activa</span>
                </div>
                <CloudOff size={16} className="text-gray-600" />
            </div>
        </div>
    );
};

export default FotosZone;
