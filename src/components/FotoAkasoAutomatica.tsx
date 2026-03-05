import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { procesarFoto } from '../utils/fotoProcessor';
import { savePhotoToStorage } from '../utils/storageManager';

interface FotoAkasoAutomaticaProps {
    pozoId: string;
    filename: string;
    categoria: 'General' | 'Interior' | 'Tuberia' | 'Sumidero';
    onSuccess: (foto: any) => void;
}

const FotoAkasoAutomatica: React.FC<FotoAkasoAutomaticaProps> = ({ pozoId, filename, categoria, onSuccess }) => {
    const [estado, setEstado] = useState<'lista' | 'abriendo' | 'detectando' | 'completado'>('lista');
    const [error, setError] = useState<string | null>(null);

    // Intent para abrir Akaso Go
    const abrirAkaso = () => {
        setEstado('abriendo');
        const intent = "intent://#Intent;package=com.cnest.motioncamera;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.cnest.motioncamera;end";
        window.location.href = intent;

        // Cuando regrese el foco a la ventana, intentamos detectar
        const handleFocus = () => {
            window.removeEventListener('focus', handleFocus);
            setEstado('detectando');
            setTimeout(detectarUltimaFoto, 1500); // Pequeño delay para que el archivo se guarde en el móvil
        };

        window.addEventListener('focus', handleFocus);
    };

    const detectarUltimaFoto = async () => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) {
                    setEstado('lista');
                    return;
                }

                setEstado('detectando');
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string;

                    // Procesar y Guardar
                    const newFoto = procesarFoto(filename, pozoId, base64);

                    const userStr = localStorage.getItem('ut_star_user');
                    const inspector = userStr ? JSON.parse(userStr).name : 'Desconocido';
                    const municipio = (window as any).CURRENT_MUNICIPIO || 'Sopó';

                    await savePhotoToStorage({
                        id: newFoto.id,
                        pozoId,
                        municipio,
                        barrio: '',
                        filename,
                        blob: base64,
                        categoria,
                        inspector,
                        timestamp: Date.now(),
                        synced: false
                    });

                    onSuccess({ ...newFoto, blobId: base64 });
                    setEstado('completado');
                    setTimeout(() => setEstado('lista'), 3000);
                };
                reader.readAsDataURL(file);
            };

            input.click();
        } catch (err) {
            console.error("Error detectando foto:", err);
            setError("Error al detectar la foto.");
            setEstado('lista');
        }
    };

    return (
        <button
            onClick={abrirAkaso}
            disabled={estado === 'abriendo' || estado === 'detectando'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: 'black',
                fontSize: '9px',
                fontWeight: '900',
                padding: '4px 10px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                opacity: (estado === 'abriendo' || estado === 'detectando') ? 0.5 : 1,
                textTransform: 'uppercase'
            }}
        >
            {estado === 'lista' && (
                <>
                    <Camera size={12} />
                    AKASO AUTO
                </>
            )}
            {estado === 'abriendo' && (
                <>
                    <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ABRIENDO...
                </>
            )}
            {estado === 'detectando' && (
                <>
                    <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    DETECTANDO...
                </>
            )}
            {estado === 'completado' && (
                <>
                    <CheckCircle2 size={12} />
                    ¡CARGADA!
                </>
            )}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </button>
    );
};

export default FotoAkasoAutomatica;
