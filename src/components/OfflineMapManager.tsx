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

const OfflineMapManager: React.FC<{
    center: { lat: number, lng: number };
    onClose: () => void;
}> = ({ center, onClose }) => {
    const [status, setStatus] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);

    const downloadArea = async (radiusKm: number) => {
        setStatus('downloading');
        setProgress(0);

        // OSM Tiling logic simplified for 1km area at zoom 17-19
        const zooms = [17, 18, 19];
        const tilesToDownload: { z: number, x: number, y: number }[] = [];

        zooms.forEach(z => {
            const x = Math.floor((center.lng + 180) / 360 * Math.pow(2, z));
            const y = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));

            // Download a 5x5 grid around center
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    tilesToDownload.push({ z, x: x + dx, y: y + dy });
                }
            }
        });

        setTotal(tilesToDownload.length);
        let count = 0;

        for (const tile of tilesToDownload) {
            const key = `osm_${tile.z}_${tile.x}_${tile.y}`;
            try {
                const res = await fetch(`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`);
                if (res.ok) {
                    const blob = await res.blob();
                    await saveTile(key, blob);
                }
            } catch (e) {
                console.error("Error downloading tile", tile, e);
            }
            count++;
            setProgress(Math.round((count / tilesToDownload.length) * 100));
        }

        setStatus('done');
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Download className="text-blue-400" size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Descargar Mapa</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-400 text-xs leading-relaxed">
                        Se descargarán las capas de calles (**OpenStreetMap**) para el área actual en la que te encuentras ({center.lat.toFixed(4)}, {center.lng.toFixed(4)}).
                    </p>

                    {status === 'idle' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => downloadArea(1)}
                                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all text-center group"
                            >
                                <div className="text-white font-bold text-sm">Área 1km</div>
                                <div className="text-[9px] text-gray-500 uppercase mt-1">Niveles 17-19</div>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-4 rounded-2xl bg-[#161b22] border border-white/5 hover:bg-white/5 transition-all text-center"
                            >
                                <div className="text-gray-400 font-bold text-sm">Cancelar</div>
                            </button>
                        </div>
                    )}

                    {status === 'downloading' && (
                        <div className="space-y-3 py-4">
                            <div className="flex justify-between text-[10px] font-black uppercase text-blue-400 tracking-widest">
                                <span>Descargando Tiles...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-[9px] text-gray-500 text-center uppercase tracking-tighter">Guardando en base de datos local (IndexedDB)</p>
                        </div>
                    )}

                    {status === 'done' && (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <CheckCircle2 className="text-green-500" size={24} />
                            </div>
                            <div className="text-center">
                                <div className="text-white font-bold text-sm">Descarga Completada</div>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase">Mapa offline listo para usar</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-4 w-full py-3 bg-blue-600 rounded-xl text-white font-bold text-xs"
                            >
                                CONTINUAR
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfflineMapManager;
