import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Database, FileText, Calendar, User, ChevronRight, Search, Loader2 } from 'lucide-react';

interface Ficha {
    id: string;
    header: {
        municipio: string;
        pozoNo: string;
        fechaUpdate: string;
        operador?: string;
    };
    geometria: {
        diametro: number;
        altura: number;
    };
}

const FichasViewer: React.FC = () => {
    const [fichas, setFichas] = useState<Ficha[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Escuchar la colección 'fichas' en tiempo real
        const q = query(collection(db, 'fichas'), orderBy('header.fechaUpdate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Ficha[];
            setFichas(docs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching fichas:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredFichas = fichas.filter(f =>
        f.header?.pozoNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.header?.municipio?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-[#0d1117] text-[#E8EEFF] p-6 rounded-xl border border-[#30363d] shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <Database className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-syne" style={{ fontFamily: 'Syne, sans-serif' }}>Base de Datos Realtime</h2>
                        <p className="text-xs text-gray-500">Visualización de fichas sincronizadas en Firestore</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar pozo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#161b22] border border-[#30363d] rounded-md pl-9 pr-4 py-1.5 text-sm outline-none focus:border-green-500/50 transition-all w-64"
                    />
                </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-green-400" />
                        <p className="text-sm font-bold uppercase tracking-widest">Conectando con Firestore...</p>
                    </div>
                ) : filteredFichas.length === 0 ? (
                    <div className="py-20 border-2 border-dashed border-[#30363d] rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
                        <FileText className="w-8 h-8 opacity-20" />
                        <p className="text-sm">No se encontraron fichas registradas</p>
                    </div>
                ) : (
                    filteredFichas.map((ficha) => (
                        <div
                            key={ficha.id}
                            className="group bg-[#161b22] border border-[#30363d] hover:border-green-500/30 rounded-lg p-4 flex items-center justify-between transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                    <FileText className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white uppercase tracking-tight">{ficha.header?.pozoNo}</span>
                                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">
                                            {ficha.header?.municipio}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <Calendar className="w-3 h-3" />
                                            {ficha.header?.fechaUpdate ? new Date(ficha.header.fechaUpdate).toLocaleString() : '---'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-bold">
                                            <User className="w-3 h-3" />
                                            {ficha.header?.operador || 'WEB_USER'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Geometría</p>
                                    <p className="text-xs font-mono text-green-400">{ficha.geometria?.diametro}m x {ficha.geometria?.altura}m</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="pt-4 border-t border-[#30363d] flex justify-between items-center text-[10px] text-gray-600 uppercase font-bold tracking-widest">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Sync Activo: Firestore (Brazil Southeast)</span>
                </div>
                <span>Total: {filteredFichas.length} registros</span>
            </div>
        </div>
    );
};

export default FichasViewer;
