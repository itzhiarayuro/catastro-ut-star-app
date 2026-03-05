import React, { useState } from 'react';
import { useAuth } from '../lib/firebase';
import { Shield, Lock, Mail, ChevronRight, AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isHuman, setIsHuman] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isHuman) {
            setError("Por favor, confirma que no eres un robot.");
            return;
        }
        if (!email || !pin) {
            setError("Por favor, completa todos los campos.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await login(email, pin);
        } catch (err: any) {
            console.error(err);
            if (err.message.includes('auth/network-request-failed')) {
                setError("No hay conexión a internet. Para el ingreso inicial o si cerraste sesión, necesitas conexión. Una vez dentro, podrás trabajar totalmente offline.");
            } else if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password')) {
                setError("Correo o contraseña incorrectos. Verifica tus datos.");
            } else if (err.message.includes('auth/user-not-found')) {
                setError("El usuario no existe. Contacta al administrador.");
            } else {
                setError(err.message || "Error al iniciar sesión.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-glass">
                <div className="login-header">
                    <div className="login-logo-container">
                        <img src="/logo-ut-star.png" alt="UT STAR Logo" className="login-logo-img" />
                    </div>
                    <h1>Acceso Campo</h1>
                    <p>Soporte Catastral / Offline Mode</p>
                </div>

                <form className="login-body" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label className="input-label">Correo Electrónico</label>
                        <div className="input-with-icon">
                            <Mail size={16} />
                            <input
                                type="email"
                                placeholder="tu.nombre@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Contraseña</label>
                        <div className="input-with-icon">
                            <Lock size={16} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Tu contraseña..."
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                style={{ paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`btn-primary ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner"></span>
                        ) : (
                            <>
                                <span>Ingresar al Sistema</span>
                                <LogIn size={18} className="arrow" />
                            </>
                        )}
                    </button>

                    <div className="login-security-badge">
                        <Lock size={12} />
                        <span>Conexión Encriptada SSL/TLS</span>
                    </div>
                </form>

                <div className="login-footer">
                    <p>© 2026 UT STAR · Soporte Catastral</p>

                    <div className="captcha-box">
                        <label className="captcha-item">
                            <input
                                type="checkbox"
                                checked={isHuman}
                                onChange={(e) => setIsHuman(e.target.checked)}
                            />
                            <div className="captcha-check"></div>
                            <span>No soy un robot</span>
                            <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" />
                        </label>
                    </div>
                </div>
            </div>

            <style>{`
                .login-container {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle at top left, #0f172a, #020617);
                    font-family: 'Inter', sans-serif;
                    z-index: 9999;
                }

                .login-glass {
                    width: 90%;
                    max-width: 400px;
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 32px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .login-logo-container {
                    width: 100px;
                    height: 100px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    margin: 0 auto 16px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                }

                .login-logo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.3));
                }

                h1 { color: white; font-size: 20px; font-weight: 700; margin-bottom: 4px; }
                .login-header p { color: #94a3b8; font-size: 12px; }

                .input-group { margin-bottom: 16px; text-align: left; }
                .input-label { display: block; color: #cbd5e1; font-size: 12px; margin-bottom: 6px; font-weight: 600; }
                
                .input-with-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-with-icon svg {
                    position: absolute;
                    left: 12px;
                    color: #64748b;
                }

                .input-with-icon input {
                    width: 100%;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px 12px 12px 40px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                    transition: 0.2s;
                }

                .input-with-icon input:focus {
                    border-color: #3b82f6;
                    background: rgba(15, 23, 42, 0.8);
                }

                .toggle-password {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    transition: 0.2s;
                }

                .toggle-password:hover {
                    color: #94a3b8;
                }

                .btn-primary {
                    width: 100%;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    margin-top: 24px;
                    transition: 0.2s;
                }

                .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

                .login-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #fca5a5;
                    padding: 12px;
                    border-radius: 12px;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 16px;
                }

                .login-security-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    color: #475569;
                    font-size: 10px;
                    margin-top: 16px;
                }

                .login-footer {
                    margin-top: 32px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    text-align: center;
                }

                .login-footer p { color: #475569; font-size: 11px; margin-bottom: 12px; }

                .captcha-box {
                    background: #f9f9f9;
                    border: 1px solid #d3d3d3;
                    border-radius: 3px;
                    padding: 6px 10px;
                    display: inline-block;
                }

                .captcha-item { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .captcha-item input { display: none; }
                .captcha-check {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #c1c1c1;
                    background: white;
                    border-radius: 2px;
                    position: relative;
                }
                .captcha-item input:checked + .captcha-check::after {
                    content: '✓';
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #00a000;
                    font-weight: bold;
                }
                .captcha-item span { color: #555; font-size: 13px; }
                .captcha-item img { width: 24px; height: 24px; }

                .spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default LoginPage;
