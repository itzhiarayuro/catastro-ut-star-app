import React from 'react';
import { Camera, FileText, ChevronRight, LogOut, HardDrive, AlertTriangle, ExternalLink, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth, functions } from '../../lib/firebase';
import { useAppStore } from '../../hooks/useAppStore';
import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';

interface PortalPageProps {
    setShowLogoutModal: (show: boolean) => void;
}

const PortalPage: React.FC<PortalPageProps> = ({ setShowLogoutModal }) => {
    const { user } = useAuth();
    const { activeScreen, setActiveScreen } = useAppStore();
    const [isCleaning, setIsCleaning] = useState(false);
    const [duplicatesInfo, setDuplicatesInfo] = useState<any>(null);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const handleCleanDrive = async () => {
        setIsCleaning(true);
        try {
            const cleanFn = httpsCallable(functions, 'cleanDriveDuplicates');
            const response: any = await cleanFn({ runMode: 'preview' });
            
            console.log("Limpieza terminada:", response.data);
            setDuplicatesInfo(response.data);
            setIsSummaryModalOpen(true);
        } catch (error: any) {
            console.error("Error al buscar en Drive:", error);
            alert(`❌ Error al buscar duplicados:\n${error.message}`);
        } finally {
            setIsCleaning(false);
        }
    };

    const handleDeleteSingle = async (fileId: string) => {
        if (!window.confirm("¿Estás seguro de mover esta copia a la papelera de Google Drive?")) return;
        setIsDeletingId(fileId);
        try {
            const trashFn = httpsCallable(functions, 'trashDriveFile');
            await trashFn({ fileId });
            
            // Remove locally from UI state
            setDuplicatesInfo((prev: any) => {
                if(!prev) return prev;
                const newDetails = prev.details.filter((d: any) => d.trashedId !== fileId);
                return { 
                    ...prev, 
                    details: newDetails,
                    duplicatesProcessed: prev.duplicatesProcessed - 1 
                };
            });
            alert("✅ Archivo movido a la papelera correctamente");
        } catch (error: any) {
            console.error(error);
            alert("❌ Falló al borrar el archivo: " + error.message);
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div id="sPortal" className={`screen ${activeScreen === 'sPortal' ? 'active' : ''}`}>
            <div className="home-center" style={{ maxWidth: '500px' }}>
                <div className="home-logo-container">
                    <img src="/logo-ut-star.png" alt="UT STAR Logo" className="home-logo-img" />
                </div>
                <div className="mb-8">
                    <div className="home-title" style={{ fontSize: '28px' }}>Portal de <span>Sistemas</span><br />UT STAR</div>
                    <p className="text-gray-400 text-xs mt-2 uppercase tracking-[2px] font-bold">Seleccione un módulo para continuar</p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* App de Registro (Campo) */}
                    <button
                        onClick={() => setActiveScreen('sActivity')}
                        style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(30, 41, 59, 0.4))',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '24px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.2)'
                        }}
                        className="group hover:scale-[1.02] hover:-translate-y-1"
                    >
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '16px', borderRadius: '18px', color: 'white', flexShrink: 0, boxShadow: '0 8px 20px -5px rgba(59, 130, 246, 0.5)' }}>
                            <Camera size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '18px', fontFamily: "'Syne', sans-serif" }}>Sistema de Registro</div>
                            <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Toma de Datos en Campo</div>
                        </div>
                        <ChevronRight className="text-blue-500/30 group-hover:text-blue-400" />
                    </button>

                    {/* Sistema de Fichas (Admin/PDF) */}
                    <button
                        onClick={() => window.open('https://sistema-fichas-tecnicas.web.app', '_blank')}
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(30, 41, 59, 0.4))',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '24px',
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.2)'
                        }}
                        className="group hover:scale-[1.02] hover:-translate-y-1"
                    >
                        <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: '16px', borderRadius: '18px', color: 'white', flexShrink: 0, boxShadow: '0 8px 20px -5px rgba(16, 185, 129, 0.5)' }}>
                            <FileText size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '18px', fontFamily: "'Syne', sans-serif" }}>Sistema de Fichas</div>
                            <div style={{ color: '#34d399', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Gestión & Exportación PDF</div>
                        </div>
                        <ChevronRight className="text-green-500/30 group-hover:text-green-400" />
                    </button>

                    {/* Botón de Limpieza de duplicados (SOLO Admin) */}
                    {user?.email?.toLowerCase().trim() === 'juanvegas003@gmail.com' && (
                        <button
                            onClick={handleCleanDrive}
                            disabled={isCleaning}
                            style={{
                                background: isCleaning 
                                    ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.1), rgba(30, 41, 59, 0.4))'
                                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(30, 41, 59, 0.4))',
                                border: `1px solid ${isCleaning ? 'rgba(156, 163, 175, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                borderRadius: '24px',
                                padding: '24px',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                cursor: isCleaning ? 'wait' : 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isCleaning ? 'none' : '0 10px 30px -10px rgba(239, 68, 68, 0.2)'
                            }}
                            className={!isCleaning ? "group hover:scale-[1.02] hover:-translate-y-1" : ""}
                        >
                            <div style={{ background: isCleaning ? 'linear-gradient(135deg, #9ca3af, #4b5563)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', padding: '16px', borderRadius: '18px', color: 'white', flexShrink: 0, boxShadow: isCleaning ? 'none' : '0 8px 20px -5px rgba(239, 68, 68, 0.5)' }}>
                                <HardDrive size={32} className={isCleaning ? "animate-pulse" : ""} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: 'white', fontWeight: '800', fontSize: '18px', fontFamily: "'Syne', sans-serif" }}>
                                    {isCleaning ? 'Limpiando...' : 'Limpiar Duplicados'}
                                </div>
                                <div style={{ color: isCleaning ? '#9ca3af' : '#f87171', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>
                                    {isCleaning ? 'Escaneando Google Drive...' : 'Mantenimiento de Google Drive'}
                                </div>
                            </div>
                            {!isCleaning && <ChevronRight className="text-red-500/30 group-hover:text-red-400" />}
                        </button>
                    )}
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1.5px', opacity: 0.6 }}>
                        Sesión Iniciada: {user?.name || user?.email}
                    </div>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="flex items-center gap-2 text-[10px] text-red-400 font-black uppercase tracking-widest hover:text-red-300 transition-colors"
                    >
                        <LogOut size={12} /> Salir del Sistema
                    </button>
                </div>
            </div>

            {/* Modal de Resultados de Duplicados */}
            {isSummaryModalOpen && duplicatesInfo && (
                <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1c2230] border border-[#2d3748] p-6 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <HardDrive className="text-blue-400" /> Resultados del Escáner
                            </h3>
                            <button onClick={() => setIsSummaryModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="bg-[#0f172a] rounded-xl p-4 mb-4 grid grid-cols-2 gap-4 text-xs font-mono">
                            <div><span className="text-gray-500">Escaneados:</span> <span className="text-white">{duplicatesInfo.scannedFiles}</span></div>
                            <div><span className="text-gray-500">Grupos ID:</span> <span className="text-white">{duplicatesInfo.groupsFound}</span></div>
                            <div><span className="text-gray-500">Duplicados:</span> <span className="text-white">{duplicatesInfo.duplicatesProcessed}</span></div>
                            <div><span className="text-gray-500">Ahorro Est.:</span> <span className="text-green-400">{(duplicatesInfo.spaceSavedBytes / 1024 / 1024).toFixed(2)} MB</span></div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {duplicatesInfo.details && duplicatesInfo.details.length > 0 ? (
                                <div className="space-y-4">
                                    <p className="text-xs text-yellow-400 mb-2 font-bold"><AlertTriangle size={14} className="inline mr-1" /> Lista de fotos repetidas idénticas. Revisa y haz clic en Borrar si deseas enviarlas a papelera.</p>
                                    {duplicatesInfo.details.map((dup: any, i: number) => (
                                        <div key={i} className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg text-xs">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold text-white truncate w-3/4">{dup.originalName}</div>
                                                <div className="text-gray-400 font-mono">{(dup.sizeBytes / 1024).toFixed(1)} KB</div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 p-2 bg-[#0d1117] rounded-lg">
                                                <a href={`https://drive.google.com/file/d/${dup.keptId}/view`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                                                    Ver Original <ExternalLink size={12} />
                                                </a>
                                                <span className="text-gray-600">|</span>
                                                <a href={`https://drive.google.com/file/d/${dup.trashedId}/view`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors">
                                                    Ver Copia <ExternalLink size={12} />
                                                </a>
                                                <div className="flex-1 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteSingle(dup.trashedId)}
                                                        disabled={isDeletingId === dup.trashedId}
                                                        className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-md font-bold transition-all flex items-center gap-2 ml-auto disabled:opacity-50"
                                                    >
                                                        {isDeletingId === dup.trashedId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                        Borrar copia
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                                    <span className="text-green-500 text-4xl mb-4">✅</span>
                                    <p className="font-bold text-base">¡El Drive está Limpio y Optimizado!</p>
                                    <p className="text-xs mt-2">No se descubrieron fotos idénticas duplicadas en la cuenta de Firebase.</p>
                                    <p className="text-xs mt-4 text-orange-400/80 bg-orange-400/10 p-4 rounded-xl border border-orange-400/20"><b>Importante:</b> Si crees que deberías ver fotos, asegúrate que se compartieron los permisos a <br/><code className="mt-2 block bg-black/50 p-2 text-[10px] select-all">firebase-adminsdk-fbsvc@catastro-ut-star.iam.gserviceaccount.com</code></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalPage;
