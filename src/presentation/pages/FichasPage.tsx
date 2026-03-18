import React, { useState } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import FichaItemRow from '../components/FichaItemRow';
import { AppState } from '../../types/catastro';
import { saveFichaToStorage } from '../../utils/storageManager';
import { safeLocalStorageSet } from '../../utils/ui';

interface FichasPageProps {
    handlePDF: (ficha: any) => void;
    pdfLoading: boolean;
    toast: (msg: string) => void;
    safeSaveAllFichas: (updated: Record<string, AppState>) => Promise<void>;
}

const FichasPage: React.FC<FichasPageProps> = ({ handlePDF, pdfLoading, toast, safeSaveAllFichas }) => {
    const { activeScreen, setActiveScreen, fichas, isOnline, setState, setCurrentStep } = useAppStore();
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const list = Object.values(fichas)
        .filter(f => !f.deleted)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setDeleteConfirmText('');
    };

    const confirmDelete = async () => {
        if (deleteConfirmText.toUpperCase() !== 'ELIMINAR' || !deleteId) {
            toast('❌ Escribe ELIMINAR para confirmar');
            return;
        }
        const fichaToDelete = fichas[deleteId];
        const updated = {
            ...fichas,
            [deleteId]: { ...fichaToDelete, deleted: true, synced: false }
        };
        await safeSaveAllFichas(updated);
        setDeleteId(null);
        toast('🗑️ Ficha movida a papelera (Soft Delete)');
    };

    return (
        <div id="sFichas" className={`screen ${activeScreen === 'sFichas' ? 'active' : ''} `}>
            <div className="app-header">
                <div className="header-inner">
                    <button onClick={() => setActiveScreen('s0')} className="btn-ghost" style={{ padding: '8px', border: 'none' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Fichas Guardadas</div>
                        <div className="header-sub">Sincronización {isOnline ? 'Activa' : 'Offline'} · {list.length} registros</div>
                    </div>
                </div>
            </div>
            <div className="content">
                {list.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <p>No hay fichas guardadas aún.</p>
                    </div>
                ) : (
                    list.map(f => (
                        <FichaItemRow
                            key={f.id}
                            f={f}
                            onEdit={() => {
                                setState(f);
                                safeLocalStorageSet('catastro_draft', JSON.stringify(f));
                                setActiveScreen('sForm');
                                setCurrentStep(1);
                            }}
                            onDelete={() => handleDeleteClick(f.id!)}
                            onPDF={() => handlePDF(f)}
                            pdfLoading={pdfLoading}
                        />
                    ))
                )}
            </div>

            {/* MODAL ELIMINAR */}
            {deleteId && (
                <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="bg-[#1c2230] border border-[#2d3748] p-6 rounded-2xl w-full max-w-xs shadow-2xl text-center">
                        <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">¿Eliminar Ficha?</h3>
                        <p className="text-gray-400 text-xs mb-6">Esta acción es permanente. Escribe <span className="text-white font-bold">ELIMINAR</span> para confirmar:</p>
                        <input
                            type="text"
                            className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center text-white font-bold uppercase mb-6"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder="..."
                        />
                        <div className="flex gap-3">
                            <button className="btn btn-ghost flex-1 py-3" onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn btn-danger flex-1 py-3" onClick={confirmDelete}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FichasPage;
