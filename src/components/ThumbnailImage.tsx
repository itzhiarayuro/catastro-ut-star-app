import React, { useState, useEffect } from 'react';
import { getPhotoFromStorage } from '../utils/storageManager';
import { fetchPhotoFromDrive } from '../utils/driveSync';
import { savePhotoToStorage } from '../utils/storageManager';

const ThumbnailImage: React.FC<{ foto: any, alt: string }> = ({ foto, alt }) => {
    const [src, setSrc] = useState<string | null>(foto?.blobId || null);
    const [loading, setLoading] = useState(!foto?.blobId && !!foto?.id);

    useEffect(() => {
        if (!foto?.blobId && foto?.id) {
            setLoading(true);
            getPhotoFromStorage(foto.id).then(async p => {
                if (p) {
                    setSrc(p.blob);
                } else if (foto.filename) {
                    const driveBlob = await fetchPhotoFromDrive(foto.filename);
                    if (driveBlob) {
                        setSrc(driveBlob);
                        savePhotoToStorage({
                            id: foto.id,
                            pozoId: foto.idPozo || '',
                            municipio: (window as any).CURRENT_MUNICIPIO || '',
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
    }, [foto?.id, foto?.blobId]);

    if (loading) return <div className="w-8 h-8 bg-gray-800 rounded animate-pulse" />;
    if (!src) return <div className="w-8 h-8 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-[8px] text-gray-500 uppercase">No foto</div>;
    
    return (
        <img 
            src={src} 
            alt={alt} 
            className="w-8 h-8 object-cover rounded border border-gray-600 shadow-sm"
        />
    );
};

export default ThumbnailImage;
