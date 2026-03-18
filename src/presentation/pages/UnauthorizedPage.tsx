import React, { useState } from 'react';
import { AlertTriangle, LogOut, LogIn } from 'lucide-react';

interface UnauthorizedPageProps {
    user: {
        email: string | null;
    };
    logout: () => Promise<void>;
}

const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({ user, logout }) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    return (
        <div style={{ background: '#020617', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', padding: '20px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Acceso No Autorizado</h1>
            <p style={{ color: '#94a3b8', maxWidth: '300px' }}>El correo <strong>{user.email}</strong> no tiene permisos para acceder a este sistema.</p>
            <button className="btn btn-ghost mt-6" onClick={() => { setShowLogoutModal(true); }} style={{ marginTop: '30px' }}>Cerrar Sesión</button>

            {/* Modal de Cierre de Sesión para no autorizados */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="bg-[#1c2230] border border-red-500/20 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl text-center animate-zoomIn">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                            <LogOut size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Cerrar Sesión</h3>
                        <p className="text-gray-400 text-xs mb-8 leading-relaxed">
                            Estás intentando salir de una cuenta <span className="text-red-400">no autorizada</span>.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                className="w-full p-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                onClick={async () => {
                                    setLoggingOut(true);
                                    await logout();
                                    setShowLogoutModal(false);
                                    setLoggingOut(false);
                                }}
                                disabled={loggingOut}
                            >
                                {loggingOut ? <span className="spinner-white"></span> : <>SALIR AHORA <LogIn size={18} /></>}
                            </button>
                            <button
                                className="w-full p-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-2xl transition-all"
                                onClick={() => setShowLogoutModal(false)}
                                disabled={loggingOut}
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnauthorizedPage;
