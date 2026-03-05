import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle2, ShieldAlert, Database, RefreshCw } from 'lucide-react';

const DB_NAME = 'UT_STAR_OFFLINE_MAPS';
const STORE_NAME = 'tiles';

export async function initOfflineDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveTile(key: string, blob: Blob) {
    const db = await initOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    return new Promise((resolve) => { tx.oncomplete = resolve; });
}

export async function getTile(key: string): Promise<Blob | null> {
    const db = await initOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

const OfflineAreaCard: React.FC<{
    title: string,
    desc: string,
    size: string,
    icon: string,
    onClick: () => void,
    disabled?: boolean
}> = ({ title, desc, size, icon, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${disabled ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/5' : 'bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-white/[0.08] active:scale-[0.98]'
            }`}
    >
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
            <div className="text-white font-bold text-sm tracking-tight">{title}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">{desc}</div>
        </div>
        <div className="text-[10px] font-mono font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">{size}</div>
    </button>
);

const OfflineMapManager: React.FC<{
    center: { lat: number, lng: number };
    onClose: () => void;
}> = ({ center, onClose }) => {
    const [status, setStatus] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [currentAction, setCurrentAction] = useState('');

    const downloadRange = async (rangeType: 'focus' | 'area' | 'urban' | 'regional') => {
        setStatus('downloading');
        setProgress(0);

        const config = {
            focus: { zooms: [17, 18, 19], grid: 2, label: 'FOCO (1km) - Detalle Máximo' },
            area: { zooms: [15, 16, 17, 18], grid: 6, label: 'ZONA (5-7km) - Detalle Alto' },
            urban: { zooms: [13, 14, 15, 16], grid: 12, label: 'MUNICIPIO (12-15km) - Nivel Calle' },
            regional: { zooms: [11, 12, 13, 14, 15], grid: 22, label: 'REGIONAL (20-25km) - Mapa Base' }
        }[rangeType];

        setCurrentAction(config.label);

        const tilesToDownload: { z: number, x: number, y: number }[] = [];

        config.zooms.forEach(z => {
            const xCenter = Math.floor((center.lng + 180) / 360 * Math.pow(2, z));
            const yCenter = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));

            for (let dx = -config.grid; dx <= config.grid; dx++) {
                for (let dy = -config.grid; dy <= config.grid; dy++) {
                    tilesToDownload.push({ z, x: xCenter + dx, y: yCenter + dy });
                }
            }
        });

        let count = 0;
        const total = tilesToDownload.length;

        // Download in chunks of 5 to avoid browser throttling
        const CHUNK_SIZE = 5;
        for (let i = 0; i < tilesToDownload.length; i += CHUNK_SIZE) {
            const chunk = tilesToDownload.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (tile) => {
                const key = `osm_${tile.z}_${tile.x}_${tile.y}`;
                try {
                    // Evitar redundancia
                    const existing = await getTile(key);
                    if (existing) {
                        count++;
                        return;
                    }

                    const res = await fetch(`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`);
                    if (res.ok) {
                        const blob = await res.blob();
                        await saveTile(key, blob);
                    }
                } catch (e) {
                    console.error("Error tile:", tile, e);
                }
                count++;
                setProgress(Math.round((count / total) * 100));
            }));

            // Pequeña pausa para UI fluida
            if (i % (CHUNK_SIZE * 5) === 0) await new Promise(r => setTimeout(r, 40));
        }

        setStatus('done');
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0d1117] border border-white/10 rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-white leading-tight">Mapas<br /><span className="text-blue-500">Offline</span></h2>
                        <p className="text-gray-500 text-[10px] mt-2 uppercase font-bold tracking-widest">Preparar carga para el campo</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="relative z-10">
                    {status === 'idle' && (
                        <div className="space-y-3">
                            <p className="text-[11px] text-blue-300 font-bold mb-4 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                ℹ️ El mapa se descargará tomando como centro el punto que estás viendo actualmente.
                            </p>

                            <OfflineAreaCard
                                icon="🎯"
                                title="Foco (Radio 1km)"
                                desc="Detalle máximo de todos los pozos y calles. Ideal para una inspección precisa."
                                size="~5MB"
                                onClick={() => downloadRange('focus')}
                            />
                            <OfflineAreaCard
                                icon="🗺️"
                                title="Área de Trabajo (Radio 5km)"
                                desc="Cubre el área inmediata con detalle alto. Balance óptimo."
                                size="~30MB"
                                onClick={() => downloadRange('area')}
                            />
                            <OfflineAreaCard
                                icon="🏙️"
                                title="Municipio Completo (+12km)"
                                desc="Toda la zona urbana del municipio con detalle nivel calle."
                                size="~85MB"
                                onClick={() => downloadRange('urban')}
                            />
                            <OfflineAreaCard
                                icon="🌎"
                                title="Mapa Regional (20km+)"
                                desc="Cubre toda la ciudad y alrededores. Ideal para recorridos largos."
                                size="~160MB"
                                onClick={() => downloadRange('regional')}
                            />

                            <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                                <ShieldAlert className="text-amber-500 shrink-0" size={18} />
                                <p className="text-[10px] text-amber-200/60 leading-normal">
                                    Los mapas se guardan localmente para usarse sin internet. Se recomienda descargar vía Wi-Fi.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'downloading' && (
                        <div className="py-12 flex flex-col items-center text-center">
                            <div className="relative w-24 h-24 mb-6">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle className="text-white/5 stroke-current" strokeWidth="6" cx="50" cy="50" r="40" fill="transparent"></circle>
                                    <circle className="text-blue-500 stroke-current transition-all duration-300" strokeWidth="6" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"
                                        strokeDasharray={`${progress * 2.51} 251`}
                                        transform="rotate(-90 50 50)"
                                    ></circle>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-black text-white text-base font-mono">
                                    {progress}%
                                </div>
                            </div>
                            <h3 className="text-white font-bold mb-1">Descargando Azulejos</h3>
                            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">{currentAction}</p>
                            <p className="text-gray-500 text-[9px] mt-4 px-4 leading-relaxed italic">Esto permitirá usar el mapa en zonas sin cobertura 4G.</p>
                        </div>
                    )}

                    {status === 'done' && (
                        <div className="py-8 text-center">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Descarga Exitosa</h3>
                            <p className="text-gray-400 text-xs mb-8">El área seleccionada ha sido guardada en la base de datos local satisfactoriamente.</p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl text-white font-bold shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                ENTENDIDO
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfflineMapManager;
