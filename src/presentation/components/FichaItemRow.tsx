import React, { useState, useEffect } from 'react';
import { Cloud, Camera, FileText, Trash2, Plus } from 'lucide-react';
import { AppState } from '../../types/catastro';
import { checkPendingInList } from '../../utils/storageManager';

interface FichaItemRowProps {
    f: AppState;
    onEdit: () => void;
    onDelete: () => void;
    onPDF: () => void;
    pdfLoading: boolean;
}

const FichaItemRow: React.FC<FichaItemRowProps> = ({ f, onEdit, onDelete, onPDF, pdfLoading }) => {
    const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const check = async () => {
            if (f.fotoList && f.fotoList.length > 0) {
                const ids = f.fotoList.map(p => p.id);
                const pending = await checkPendingInList(ids);
                setPendingPhotos(pending);
            }
            setChecking(false);
        };
        check();
        const interval = setInterval(check, 10000); // Check cada 10s
        return () => clearInterval(interval);
    }, [f.fotoList]);

    const hasPending = pendingPhotos.length > 0;
    const totalPhotos = f.fotoList?.length || 0;

    return (
        <div className="ficha-item" onClick={onEdit}>
            <div className="ficha-item-title">
                <span className="flex items-center gap-2">
                    Pozo {f.pozo || '-'}
                    {f.synced ? (
                        <Cloud size={14} className="text-green-500" />
                    ) : (
                        <Cloud size={14} className="text-gray-600" />
                    )}
                </span>
                <span className={`badge ${f.sistema === 'PLUVIAL' ? 'badge-blue' : 'badge-orange'}`}>{f.sistema || '?'}</span>
            </div>
            <div className="ficha-item-meta" style={{ gap: '10px' }}>
                <span>📅 {f.fecha}</span>
                <span>📍 {f.barrio || f.municipio}</span>

                <span className="flex items-center gap-1">
                    <Camera size={12} />
                    {checking ? '...' : (
                        <span className={hasPending ? 'text-amber-500' : 'text-green-500'}>
                            {totalPhotos - pendingPhotos.length}/{totalPhotos}
                        </span>
                    )}
                </span>

                <button
                    onClick={(e) => { e.stopPropagation(); onPDF(); }}
                    disabled={pdfLoading}
                    className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors flex items-center justify-center min-w-[36px]"
                >
                    {pdfLoading ? <div className="spinner-white" style={{ width: '12px', height: '12px', borderWidth: '1px' }}></div> : <FileText size={16} />}
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
            {f.creatorEmail && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Plus size={8} className="text-blue-400" />
                    </div>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                        Creador: <span className="text-blue-400/80">{f.creatorEmail}</span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default FichaItemRow;
