import React, { useState, useEffect } from 'react';
import { getPhotoFromStorage } from '../utils/storageManager';
import { fetchPhotoFromDrive } from '../utils/driveSync';
import { savePhotoToStorage } from '../utils/storageManager';

const ThumbnailImage: React.FC<{ foto: any, alt: string, municipio: string }> = ({ foto, alt, municipio }) => {
    const [src, setSrc] = useState<string | null>(foto?.blobId || null);
    const [loading, setLoading] = useState(!foto?.blobId && !!foto?.id);

    useEffect(() => {
        if (!foto?.blobId && foto?.id) {
            setLoading(true);
            getPhotoFromStorage(foto.id).then(async p => {
                if (p) {
                    setSrc(p.blob);
                } else if (foto.filename && municipio) {
                    const driveBlob = await fetchPhotoFromDrive(foto.filename, municipio);
                    if (driveBlob) {
                        setSrc(driveBlob);
                        savePhotoToStorage({
                            id: foto.id,
                            pozoId: foto.idPozo || '',
                            municipio: municipio,
                            barrio: '',
                            filename: foto.filename,
                            blob: driveBlob,
                            categoria: foto.categoria || 'General',
                            inspector: 'Sistema',
                            timestamp: Date.now(),
                            synced: true
                        }).catch(err => console.error("Error saving downloaded photo:", err));
                    }
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setSrc(foto?.blobId || null);
            setLoading(false);
        }
    }, [foto?.id, foto?.blobId, municipio]);

    if (loading) return <div style={{ width: '32px', height: '32px', minWidth: '32px', background: '#222', borderRadius: '4px' }} className="animate-pulse" />;
    if (!src) return <div style={{ width: '32px', height: '32px', minWidth: '32px', background: '#222', borderRadius: '4px', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#888', textTransform: 'uppercase' }}>Ø</div>;
    
    return (
        <img 
            src={src} 
            alt={alt} 
            style={{ width: '32px', height: '32px', minWidth: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #444' }}
            className="shadow-sm"
        />
    );
};

export default ThumbnailImage;
