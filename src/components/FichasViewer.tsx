import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db, useAuth } from '../lib/firebase';
import { FileText, Calendar, User, ChevronRight, Search, Loader2, MapPin, BarChart3, Database, RotateCw } from 'lucide-react';
import { validateFicha } from '../utils/syncRegistry';
import { useAppStore } from '../hooks/useAppStore';

type TabType = 'fichas' | 'marcaciones';

interface FirestoreRecord {
    id: string;
    pozo?: string;
    codigo?: string;
    municipio?: string;
    lastSync?: string;
    elaboro?: string;
    inspector?: string;
    creatorDisplayName?: string;
    creatorEmail?: string;
    diam?: number | string;
    altura?: number | string;
    sistema?: string;
    tipoRegistro?: string;
    tipoElemento?: string;
    deleted?: boolean;
    pipes?: any[];
    sums?: any[];
    barrio?: string;
    direccion?: string;
    estadoPozo?: string;
    estado?: string;
    gps?: { lat?: number; lng?: number };
    fotoList?: any[];
    [key: string]: any;
}

interface FichasViewerProps {
    toast: (msg: string) => void;
    handlePDF: (ficha: any) => void;
    pdfLoading: boolean;
}

const FichasViewer: React.FC<FichasViewerProps> = ({ toast, handlePDF, pdfLoading }) => {
    const { activeScreen, setActiveScreen } = useAppStore();
    const { user } = useAuth();
    const [fichas, setFichas] = useState<FirestoreRecord[]>([]);
    const [marcaciones, setMarcaciones] = useState<FirestoreRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('fichas');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filtros adicionales
    const [filterSistema, setFilterSistema] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterNivel, setFilterNivel] = useState('');
    const [filterMunicipio, setFilterMunicipio] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const [timeoutError, setTimeoutError] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!user) {
                // Not logged in yet
                setLoading(false);
                return;
            }
            // Only fetch when the screen is active to prevent app startup lag
            if (activeScreen !== 'sFichasViewer') {
                return;
            }

            setLoading(true);
            setTimeoutError(false);
            try {
                const isAdmin = user?.email === 'juanvegas003@gmail.com' || user?.email === 'juan.vega.icya@gmail.com';

                // Fichas: Reducir límite para evitar timeout (1500)
                const qFichas = isAdmin
                    ? query(collection(db, 'fichas'), orderBy('lastSync', 'desc'), limit(1500))
                    : query(collection(db, 'fichas'), where('createdBy', '==', user.uid), orderBy('lastSync', 'desc'), limit(800));
                
                // Agregamos un timeout de 25s por si Firebase se queda colgado
                const fetchFichas = getDocs(qFichas);
                const snapFichas = await Promise.race([
                    fetchFichas,
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 25000))
                ]);
                const fData = snapFichas.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord));
                setFichas(fData.filter(d => !d.deleted));

                // Marcaciones: Reducir límite
                const qMarc = isAdmin
                    ? query(collection(db, 'marcaciones'), orderBy('lastSync', 'desc'), limit(1500))
                    : query(collection(db, 'marcaciones'), where('createdBy', '==', user.uid), orderBy('lastSync', 'desc'), limit(800));
                
                const fetchMarc = getDocs(qMarc);
                const snapMarc = await Promise.race([
                    fetchMarc,
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 25000))
                ]);
                const mData = snapMarc.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecord));
                setMarcaciones(mData.filter(d => !d.deleted));
            } catch (err: any) {
                console.error("Error loading cloud data:", err);
                if (err.message === "TIMEOUT") {
                    setTimeoutError(true);
                }
            }
            setLoading(false);
        };
        loadData();
    }, [user, activeScreen, refreshKey]);

    const currentData = activeTab === 'fichas' ? fichas : marcaciones;

    // Estadísticas globales (Dashboard rápido)
    const stats = {
        fichas: fichas.length,
        marcaciones: marcaciones.length,
        tuberia: fichas.reduce((acc, f) => acc + (f.pipes?.length || 0), 0),
        sumideros: fichas.reduce((acc, f) => acc + (f.sums?.length || 0), 0)
    };

    // Extraer opciones únicas para los filtros basados en la data actual
    const uniqueSistemas = Array.from(new Set(currentData.map(d => d.sistema).filter(Boolean).sort()));
    const uniqueEstados = Array.from(new Set(currentData.map(d => d.estadoPozo || d.estado).filter(Boolean).sort()));
    const uniqueMunicipios = Array.from(new Set(currentData.map(d => d.municipio).filter(Boolean).sort()));

    const filtered = currentData.filter(f => {
        // 1. Búsqueda por texto (Cualquier campo traído)
        const term = searchTerm.toLowerCase();
        const searchableText = Object.values(f)
            .filter(v => typeof v === 'string' || typeof v === 'number')
            .join(' ')
            .toLowerCase();

        const matchSearch = searchTerm === '' || searchableText.includes(term);

        // 2. Filtros de Selects
        const matchSistema = !filterSistema || f.sistema === filterSistema;
        const matchEstado = !filterEstado || (f.estadoPozo === filterEstado || f.estado === filterEstado);
        const matchMunicipio = !filterMunicipio || f.municipio === filterMunicipio;
        
        // 3. Filtro de Nivel (Completitud)
        let matchNivel = true;
        if (filterNivel === 'complete') {
            matchNivel = activeTab === 'fichas' ? validateFicha(f) : !!(f.codigo && f.municipio && f.gps);
        } else if (filterNivel === 'incomplete') {
            matchNivel = activeTab === 'fichas' ? !validateFicha(f) : !(f.codigo && f.municipio && f.gps);
        } else if (filterNivel === 'warning') {
            matchNivel = activeTab === 'fichas' ? (validateFicha(f) && (!f.fotoList || f.fotoList.length < 3)) : false;
        }

        return matchSearch && matchSistema && matchEstado && matchMunicipio && matchNivel;
    });

    const formatDate = (d?: string) => {
        if (!d) return '---';
        try { return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return d; }
    };

    const getDisplayName = (f: FirestoreRecord) => f.pozo || f.codigo || f.id;
    const getInspector = (f: FirestoreRecord) => f.elaboro || f.inspector || f.creatorDisplayName || f.creatorEmail?.split('@')[0] || 'Desconocido';

    return (
        <div className="bg-[#0d1117] text-[#E8EEFF] rounded-xl border border-[#30363d] shadow-2xl overflow-hidden">

            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d' }}>
                <button
                    onClick={() => setActiveTab('fichas')}
                    style={{
                        flex: 1,
                        padding: '14px',
                        background: activeTab === 'fichas' ? 'rgba(16,185,129,0.1)' : 'transparent',
                        color: activeTab === 'fichas' ? '#10b981' : '#64748b',
                        border: 'none',
                        borderBottom: activeTab === 'fichas' ? '2px solid #10b981' : '2px solid transparent',
                        fontWeight: 800,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <FileText size={16} />
                    Fichas Técnicas
                    <span style={{
                        background: activeTab === 'fichas' ? '#10b981' : '#30363d',
                        color: activeTab === 'fichas' ? '#000' : '#64748b',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 900,
                        minWidth: '24px',
                        textAlign: 'center'
                    }}>
                        {fichas.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('marcaciones')}
                    style={{
                        flex: 1,
                        padding: '14px',
                        background: activeTab === 'marcaciones' ? 'rgba(245,158,11,0.1)' : 'transparent',
                        color: activeTab === 'marcaciones' ? '#f59e0b' : '#64748b',
                        border: 'none',
                        borderBottom: activeTab === 'marcaciones' ? '2px solid #f59e0b' : '2px solid transparent',
                        fontWeight: 800,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <MapPin size={16} />
                    Marcaciones
                    <span style={{
                        background: activeTab === 'marcaciones' ? '#f59e0b' : '#30363d',
                        color: activeTab === 'marcaciones' ? '#000' : '#64748b',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 900,
                        minWidth: '24px',
                        textAlign: 'center'
                    }}>
                        {marcaciones.length}
                    </span>
                </button>
            </div>
            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={18} style={{ color: '#10b981' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Estadísticas de Red</h3>
                    </div>
                    <button 
                        onClick={() => setRefreshKey(k => k + 1)} 
                        style={{ 
                            background: '#161b22', 
                            border: '1px solid #30363d', 
                            color: '#10b981', 
                            borderRadius: '8px',
                            cursor: 'pointer', 
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase'
                        }}
                    >
                        <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                        ACTUALIZAR
                    </button>
                </div>

                {/* SMALL DASHBOARD */}

                {!loading && !timeoutError && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '8px', 
                        marginBottom: '20px',
                        background: '#161b22',
                        padding: '12px',
                        borderRadius: '16px',
                        border: '1px solid #30363d'
                    }}>
                        <div style={{ background: '#0d1117', padding: '10px', borderRadius: '12px', border: '1px solid #30363d40' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', marginBottom: '4px' }}>
                                <FileText size={12} />
                                <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>Fichas</span>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>{stats.fichas}</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>{stats.tuberia} tubos registrados</div>
                        </div>
                        <div style={{ background: '#0d1117', padding: '10px', borderRadius: '12px', border: '1px solid #30363d40' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', marginBottom: '4px' }}>
                                <MapPin size={12} />
                                <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>Marcas</span>
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>{stats.marcaciones}</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>{stats.sumideros} sumideros fichas</div>
                        </div>
                    </div>
                )}

                {/* SEARCH BAR */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search
                        size={16}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                        type="text"
                        placeholder="Buscar por código, dirección o barrio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '12px',
                            padding: '10px 14px 10px 38px',
                            color: '#E8EEFF',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* FILTERS */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    <select 
                        value={filterSistema}
                        onChange={(e) => setFilterSistema(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#E8EEFF',
                            fontSize: '11px',
                            outline: 'none'
                        }}
                    >
                        <option value="">Todos los sistemas</option>
                        {uniqueSistemas.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select 
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#E8EEFF',
                            fontSize: '11px',
                            outline: 'none'
                        }}
                    >
                        <option value="">Todos los estados</option>
                        {uniqueEstados.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="DESCONOCIDO">DESCONOCIDO</option>
                    </select>

                    <select 
                        value={filterNivel}
                        onChange={(e) => setFilterNivel(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#E8EEFF',
                            fontSize: '11px',
                            outline: 'none'
                        }}
                    >
                        <option value="">Todos los niveles</option>
                        <option value="complete">Completos</option>
                        <option value="incomplete">Incompletos</option>
                        <option value="warning">Con advertencias</option>
                    </select>

                    <select 
                        value={filterMunicipio}
                        onChange={(e) => setFilterMunicipio(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            color: '#E8EEFF',
                            fontSize: '11px',
                            outline: 'none'
                        }}
                    >
                        <option value="">Todos los municipios</option>
                        {uniqueMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* LIST */}
                <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', gap: '12px' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: activeTab === 'fichas' ? '#10b981' : '#f59e0b' }} />
                            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>Cargando datos globales...<br/><br/>(Esto puede tardar unos segundos)</p>
                        </div>
                    ) : timeoutError ? (
                        <div style={{ padding: '60px 20px', border: '2px dashed #f87171', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f87171', gap: '12px' }}>
                            <p style={{ fontSize: '13px', textAlign: 'center' }}>
                                Error de conexión o tiempo de espera agotado.
                            </p>
                            <button 
                                onClick={() => setActiveScreen('sPortal')} 
                                style={{
                                    background: '#161b22', color: '#f87171', border: '1px solid #f87171', borderRadius: '8px', padding: '8px 16px', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                                }}
                            >
                                VOLVER
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '60px 20px', border: '2px dashed #30363d', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '8px' }}>
                            {activeTab === 'fichas' ? <FileText size={32} style={{ opacity: 0.2 }} /> : <MapPin size={32} style={{ opacity: 0.2 }} />}
                            <p style={{ fontSize: '13px' }}>
                                {searchTerm || filterSistema || filterEstado || filterMunicipio || filterNivel ? 'No se encontraron resultados para los filtros aplicados' : `No se encontraron ${activeTab === 'fichas' ? 'fichas' : 'marcaciones'} registradas`}
                            </p>
                        </div>
                    ) : (
                        filtered.map((record) => {
                            const isFicha = activeTab === 'fichas';
                            const accentColor = isFicha ? '#10b981' : '#f59e0b';
                            const isExpanded = expandedId === record.id;

                            return (
                                <div key={record.id}>
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : record.id)}
                                        style={{
                                            background: '#161b22',
                                            border: `1px solid ${isExpanded ? accentColor + '40' : '#30363d'}`,
                                            borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                                            padding: '14px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{
                                                width: '42px', height: '42px', borderRadius: '50%',
                                                background: accentColor + '15',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {isFicha
                                                    ? <FileText size={20} style={{ color: accentColor }} />
                                                    : <MapPin size={20} style={{ color: accentColor }} />
                                                }
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 800, color: 'white', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.5px' }}>
                                                        {getDisplayName(record)}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '9px',
                                                        background: '#3b82f6' + '15',
                                                        color: '#60a5fa',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #3b82f6' + '30',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {record.municipio || '---'}
                                                    </span>
                                                    {record.sistema && (
                                                        <span style={{
                                                            fontSize: '9px',
                                                            background: '#8b5cf6' + '15',
                                                            color: '#a78bfa',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #8b5cf6' + '30',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {record.sistema}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                                                        <Calendar size={10} />
                                                        {formatDate(record.lastSync || record.createdAt)}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                                                        <User size={10} />
                                                        {getInspector(record)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            {isFicha && record.diam && record.altura && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Geometría</p>
                                                    <p style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: accentColor }}>
                                                        Ø{record.diam}m × {record.altura}m
                                                    </p>
                                                </div>
                                            )}
                                            <ChevronRight
                                                size={18}
                                                style={{
                                                    color: isExpanded ? accentColor : '#30363d',
                                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    transition: 'all 0.2s'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* EXPANDED DETAILS */}
                                    {isExpanded && (
                                        <div style={{
                                            background: '#0d1117',
                                            border: `1px solid ${accentColor}40`,
                                            borderTop: 'none',
                                            borderRadius: '0 0 12px 12px',
                                            padding: '14px',
                                            fontSize: '11px',
                                            color: '#94a3b8'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div><strong style={{ color: '#64748b' }}>ID Doc:</strong> <span style={{ color: '#e2e8f0', fontFamily: "'DM Mono', monospace", fontSize: '10px' }}>{record.id}</span></div>
                                                <div><strong style={{ color: '#64748b' }}>Municipio:</strong> {record.municipio || '---'}</div>
                                                <div><strong style={{ color: '#64748b' }}>Dirección:</strong> {record.direccion || '---'}</div>
                                                <div><strong style={{ color: '#64748b' }}>Estado:</strong> {record.estadoPozo || record.estado || '---'}</div>
                                                {record.gps?.lat && (
                                                    <div><strong style={{ color: '#64748b' }}>GPS:</strong> {record.gps.lat?.toFixed(5)}, {record.gps.lng?.toFixed(5)}</div>
                                                )}
                                                {isFicha && (
                                                    <>
                                                        <div><strong style={{ color: '#64748b' }}>Tuberías:</strong> {record.pipes?.length || 0}</div>
                                                        <div><strong style={{ color: '#64748b' }}>Sumideros:</strong> {record.sums?.length || 0}</div>
                                                    </>
                                                )}
                                                {!isFicha && record.tipoElemento && (
                                                    <div><strong style={{ color: '#64748b' }}>Tipo:</strong> {record.tipoElemento}</div>
                                                )}
                                            </div>

                                            {/* ACTION BUTTONS (PDF) */}
                                            {isFicha && (
                                                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePDF(record);
                                                        }}
                                                        disabled={pdfLoading}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            padding: '8px 16px',
                                                            fontSize: '11px',
                                                            fontWeight: 800,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                                            opacity: pdfLoading ? 0.7 : 1
                                                        }}
                                                    >
                                                        {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                                        GENERAR PDF
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* FOOTER STATUS */}
                <div style={{
                    paddingTop: '14px',
                    marginTop: '14px',
                    borderTop: '1px solid #30363d',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: '#475569',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                        Firestore Online
                    </div>
                    <span>
                        {activeTab === 'fichas' ? `${filtered.length} fichas` : `${filtered.length} marcaciones`}
                        {(searchTerm || filterSistema || filterEstado || filterMunicipio || filterNivel) && ` (filtradas)`}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FichasViewer;
