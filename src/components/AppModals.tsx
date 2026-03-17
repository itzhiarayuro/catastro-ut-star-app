import React from 'react';
import {
    LogOut, AlertTriangle, FileText, Copy, Trash2
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   LOGOUT MODAL
   ───────────────────────────────────────────────────────────── */

interface LogoutModalProps {
    user: any;
    pendingCount: number;
    loggingOut: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
    user, pendingCount, loggingOut, onConfirm, onCancel
}) => (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-[#1c2230] border border-amber-500/20 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-center animate-zoomIn">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                <LogOut size={36} className="text-amber-500" />
            </div>

            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Cerrar Sesión</h3>
            <p className="text-gray-400 text-[10px] mb-6 uppercase tracking-widest">{user?.name} ({user?.email})</p>

            <div className="space-y-3 mb-8">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                        <span className="text-amber-500 font-black">⚠️ SEÑAL REQUERIDA:</span> Si sales en zona sin señal, <span className="text-white font-bold">no podrás entrar</span> hasta volver a tener internet.
                    </p>
                </div>

                {pendingCount > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                        <p className="text-red-400 text-[11px] font-bold leading-relaxed">
                            ⚠️ TIENES {pendingCount} FOTOS SIN SUBIR. <br />
                            Sincroniza antes de salir para evitar pérdida de datos.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <button
                    className="w-full p-5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-xl shadow-amber-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    onClick={onConfirm}
                    disabled={loggingOut}
                >
                    {loggingOut ? (
                        <span className="flex items-center gap-2">
                            <span className="spinner-white"></span>
                            CERRANDO...
                        </span>
                    ) : (
                        <>CERRAR SESIÓN AHORA <LogOut size={20} /></>
                    )}
                </button>

                <button
                    className="w-full p-4 bg-white/5 hover:bg-white/10 text-gray-500 font-bold rounded-2xl transition-all"
                    onClick={onCancel}
                    disabled={loggingOut}
                >
                    CANCELAR
                </button>
            </div>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   CLEAR DATABASE MODAL
   ───────────────────────────────────────────────────────────── */

interface ClearDbModalProps {
    confirmText: string;
    onConfirmTextChange: (text: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ClearDbModal: React.FC<ClearDbModalProps> = ({
    confirmText, onConfirmTextChange, onConfirm, onCancel
}) => (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 20000,
        backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn 0.3s ease-out'
    }}>
        <div style={{
            backgroundColor: '#161b22', border: '1px solid rgba(255, 69, 96, 0.3)',
            borderRadius: '28px', padding: '32px 24px', width: '100%', maxWidth: '360px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 69, 96, 0.1)',
            textAlign: 'center', position: 'relative', maxHeight: '90vh', overflowY: 'auto'
        }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(255, 69, 96, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255, 69, 96, 0.2)' }}>
                <AlertTriangle size={32} color="#FF4560" />
            </div>

            <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Limpieza Crítica</h3>
            <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>Base de Datos Local</p>

            <div style={{ background: 'rgba(255, 69, 96, 0.05)', border: '1px solid rgba(255, 69, 96, 0.1)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ color: '#fca5a5', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', lineHeight: '1.6', margin: 0 }}>
                    ⚠️ ¡ELIMINACIÓN TOTAL! <br />
                    <span style={{ opacity: 0.6, fontWeight: '400' }}>BORRARÁ FICHAS NO SINCRONIZADAS Y FOTOS. NO SE PUEDE REVERTIR.</span>
                </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <p style={{ color: '#64748b', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>ESCRIBE <span style={{ color: 'white', fontWeight: 'bold' }}>ELIMINAR</span> PARA CONFIRMAR:</p>
                <input
                    type="text"
                    style={{ width: '100%', background: '#0d1117', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '14px', color: 'white', textAlign: 'center', fontSize: '14px', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.2s', textTransform: 'uppercase' }}
                    value={confirmText}
                    onChange={e => onConfirmTextChange(e.target.value)}
                    placeholder="ELIMINAR"
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                    style={{ width: '100%', padding: '16px', background: '#FF4560', color: 'white', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 8px 16px rgba(255, 69, 96, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={onConfirm}
                >
                    SÍ, ELIMINAR TODO <Trash2 size={16} />
                </button>

                <button
                    style={{ width: '100%', padding: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', borderRadius: '16px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer' }}
                    onClick={onCancel}
                >
                    CANCELAR Y REGRESAR
                </button>
            </div>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   PDF DEBUG LOGS MODAL
   ───────────────────────────────────────────────────────────── */

interface PdfDebugModalProps {
    logs: string[];
    onCopy: () => void;
    onClose: () => void;
}

export const PdfDebugModal: React.FC<PdfDebugModalProps> = ({
    logs, onCopy, onClose
}) => (
    <div className="fixed inset-0 z-[99999] bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn">
        <div className="bg-[#0f172a] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-blue-500/30 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#1e293b]/50 rounded-t-2xl shrink-0">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <FileText size={18} className="text-blue-400" />
                        Traza de Generación de PDF (Debug)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono mt-1">Logs del servidor detallando la resolución de la ficha.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCopy}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg"
                    >
                        <Copy size={16} /> COPIAR LOGS
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-gray-400 w-10 h-10 rounded-lg flex items-center justify-center transition border border-white/10 text-lg shadow-lg"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#020617] rounded-b-2xl custom-scrollbar relative">
                <pre className="text-[11px] md:text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    {logs.length === 0 ? (
                        <div className="text-gray-500 italic p-4 text-center">El servidor no retornó traza de logs.</div>
                    ) : (
                        logs.map((line, i) => {
                            let colorClass = "text-gray-300";
                            if (line.includes("[ERROR]")) colorClass = "text-red-400 font-bold bg-red-900/20";
                            else if (line.includes("[WARN]")) colorClass = "text-amber-400";
                            else if (line.includes("✅")) colorClass = "text-green-400";
                            else if (line.includes("❌")) colorClass = "text-red-400";
                            else if (line.startsWith("===")) colorClass = "text-blue-400/80 font-bold";
                            else if (line.includes("Generando PDF")) colorClass = "text-white font-bold";

                            return (
                                <div key={i} className={`pb-1 mb-1 border-b border-white/5 break-all ${colorClass}`}>
                                    {line}
                                </div>
                            );
                        })
                    )}
                </pre>
            </div>
        </div>
    </div>
);
