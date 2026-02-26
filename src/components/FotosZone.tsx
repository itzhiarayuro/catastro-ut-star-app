import React, { useState } from 'react';
import { Camera, Trash2, MapPin, Clock, CheckCircle2, CloudOff } from 'lucide-react';

interface Photo {
    id: string;
    url: string;
    timestamp: string;
    gps: string;
    zona: string;
}

const PhotoItem: React.FC<{ photo: Photo; onDelete: (id: string) => void }> = ({ photo, onDelete }) => (
    <div className="relative group w-[72px] h-[72px] shrink-0">
        <img
            src={photo.url}
            alt="Captura"
            className="w-full h-full object-cover rounded-lg border border-[#30363d] group-hover:border-blue-500 transition-all"
        />
        <button
            onClick={() => onDelete(photo.id)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
            <Trash2 className="w-3 h-3" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-[2px] rounded-b-lg py-0.5 px-1 flex items-center justify-between pointer-events-none">
            <MapPin className="w-2 h-2 text-green-400" />
            <Clock className="w-2 h-2 text-blue-400" />
        </div>
    </div>
);

const ZoneSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    photos: Photo[];
    onAdd: (zona: string) => void;
    onDelete: (id: string) => void;
}> = ({ title, icon, photos, onAdd, onDelete }) => (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="text-blue-400">{icon}</div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-500 bg-[#0d1117] px-2 py-0.5 rounded-full border border-[#30363d]">
                {photos.length} fotos
            </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center min-h-[72px]">
            {photos.map(p => (
                <PhotoItem key={p.id} photo={p} onDelete={onDelete} />
            ))}
            <button
                onClick={() => onAdd(title)}
                className="w-[72px] h-[72px] border-2 border-dashed border-[#30363d] hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-gray-500 hover:text-blue-400 shrink-0"
            >
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-bold uppercase">Captura</span>
            </button>
        </div>
    </div>
);

const FotosZone: React.FC = () => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const zones = [
        { id: 'general', title: 'General / Panorámica', icon: <Camera className="w-4 h-4" /> },
        { id: 'interior', title: 'Interior Pozo', icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'danos', title: 'Daños / Patologías', icon: <Trash2 className="w-4 h-4 text-red-400" /> },
        { id: 'tuberias', title: 'Tuberías / Empalmes', icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
    ];

    const handleAddPhoto = (zona: string) => {
        // Mock photo capture logic
        const newPhoto: Photo = {
            id: Math.random().toString(36).substr(2, 9),
            url: `https://picsum.photos/seed/${Math.random()}/200`, // Placeholder dynamic image
            timestamp: new Date().toISOString(),
            gps: '4.8152° N, 73.9231° W',
            zona
        };

        setPhotos([...photos, newPhoto]);

        // Offline Queue Simulation
        const queue = JSON.parse(localStorage.getItem('photo_sync_queue') || '[]');
        queue.push(newPhoto);
        localStorage.setItem('photo_sync_queue', JSON.stringify(queue));
    };

    const handleDeletePhoto = (id: string) => {
        setPhotos(photos.filter(p => p.id !== id));
        // Also remove from local queue if not synced
        const queue = JSON.parse(localStorage.getItem('photo_sync_queue') || '[]');
        localStorage.setItem('photo_sync_queue', JSON.stringify(queue.filter((p: any) => p.id !== id)));
    };

    return (
        <div className="bg-[#0d1117] text-[#E8EEFF] p-6 rounded-xl border border-[#30363d] shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Camera className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-syne" style={{ fontFamily: 'Syne, sans-serif' }}>Galería de Registro</h2>
                        <p className="text-xs text-gray-500">Evidencia técnica con metadatos EXIF</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-full">
                    <CloudOff className="w-4 h-4 text-orange-400" />
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Cola Offline Activa</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zones.map(z => (
                    <ZoneSection
                        key={z.id}
                        title={z.title}
                        icon={z.icon}
                        photos={photos.filter(p => p.zona === z.title)}
                        onAdd={handleAddPhoto}
                        onDelete={handleDeletePhoto}
                    />
                ))}
            </div>

            <div className="pt-4 border-t border-[#30363d] flex justify-between items-center text-[10px] text-gray-600 uppercase font-bold tracking-widest">
                <span>Sincronización automática vía EXIFR</span>
                <span className="text-blue-500">Total: {photos.length} Archivos en cola</span>
            </div>
        </div>
    );
};

export default FotosZone;
