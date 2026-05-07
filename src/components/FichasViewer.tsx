import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
    FileText, Calendar, User, ChevronRight, Search, Loader2,
    MapPin, BarChart3, RotateCw, Layers, Droplets, GitFork, Database, CloudDownload,
    Image as ImageIcon
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { PdfFastButton } from '../hooks/usePdfExportFast';
import ThumbnailImage from './ThumbnailImage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TabType = 'pozos' | 'marcaciones' | 'tuberias' | 'sumideros';

interface BQRow { [key: string]: any }

interface FichasViewerProps {
    toast: (msg: string) => void;
    handlePDF: (ficha: any) => void;
    pdfLoading: boolean;
    onEditFicha?: (ficha: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.PROD
    ? 'https://us-central1-catastro-ut-star.cloudfunctions.net'
    : 'http://127.0.0.1:5001/catastro-ut-star/us-central1';

const ENDPOINT_MAP: Record<TabType, string> = {
    pozos:       `${BASE_URL}/bqGetPozos`,
    marcaciones: `${BASE_URL}/bqGetMarcaciones`,
    tuberias:    `${BASE_URL}/bqGetTuberias`,
    sumideros:   `${BASE_URL}/bqGetSumideros`,
};

const TAB_CONFIG: Record<TabType, { label: string; color: string; icon: React.ReactNode }> = {
    pozos:       { label: 'Pozos',       color: '#10b981', icon: <FileText size={15} /> },
    marcaciones: { label: 'Marcaciones', color: '#f59e0b', icon: <MapPin size={15} /> },
    tuberias:    { label: 'Tuberías',    color: '#3b82f6', icon: <GitFork size={15} /> },
    sumideros:   { label: 'Sumideros',   color: '#a78bfa', icon: <Droplets size={15} /> },
};

// Campos clave para mostrar en la tarjeta de cada tab
const CARD_FIELDS: Record<TabType, { primary: string; secondary: string; badge1?: string; badge2?: string }> = {
    pozos:       { primary: 'Idpozo',           secondary: 'Direccion',     badge1: 'Municipio',  badge2: 'Sistema' },
    marcaciones: { primary: 'Id_pozo_sumidero',  secondary: 'Tipo_de_elemento', badge1: 'Municipio', badge2: 'id_pz_s' },
    tuberias:    { primary: 'Id_tuberia',        secondary: 'Tipo_Tuberia',  badge1: 'Municipio',  badge2: 'Material' },
    sumideros:   { primary: 'Id_sumidero',       secondary: 'Tipo',         badge1: 'Municipio',  badge2: 'Material' },
};

const fmt = (v: any) => v != null ? String(v) : '---';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const FichasViewer: React.FC<FichasViewerProps> = ({ toast, handlePDF, pdfLoading, onEditFicha }) => {
    const { activeScreen } = useAppStore();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>('pozos');
    const [data, setData] = useState<BQRow[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Navegación al detalle/mapa para cualquier tipo de registro
    const handleNavigateToDetail = (row: BQRow) => {
        if (!onEditFicha) return;

        try {
            let ficha: any = null;
            if (row.rawData) {
                ficha = JSON.parse(row.rawData);
            } else {
                // Construir ficha mínima para ver en mapa
                ficha = {
                    pozo: row.Id_pozo_sumidero || row.Id_pozo || row.Id_sumidero || row.Id_tuberia || 'S/N',
                    fecha: row.Fecha || row.Fecha_de_registro || new Date().toISOString().split('T')[0],
                    municipio: row.Municipio || '',
                    barrio: row.Barrio || '',
                    direccion: row.Direccion || '',
                    gps: {
                        lat: row.Latitud || null,
                        lng: row.Longitud || null,
                        precision: 1
                    },
                    sistema: row.Sistema || '',
                    creatorEmail: row.Levanto_Email || '',
                    rawData: JSON.stringify(row), // Guardar el row original por si acaso
                    isReadOnly: true // Bandera opcional para el form
                };
            }
            onEditFicha(ficha);
        } catch (err) {
            console.error("Error al navegar al detalle:", err);
            toast("Error al abrir el detalle del registro");
        }
    };

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMunicipio, setFilterMunicipio] = useState('');
    const [filterExtra, setFilterExtra] = useState(''); // sistema | tipo | material
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Contar cargas por tab para mostrar badge
    const [tabCounts, setTabCounts] = useState<Partial<Record<TabType, number>>>({});

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // ─────────────────────────────────────────────────────────────────────────
    // Fetch desde BigQuery via Cloud Function
    // ─────────────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!user || activeScreen !== 'sFichasViewer') return;

        setLoading(true);
        setError(null);
        setExpandedId(null);

        try {
            // Obtener token Firebase actual
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Sin sesión activa');

            // Traer TODO para este tab y hacer filtrado local (super rápido)
            const url = `${ENDPOINT_MAP[activeTab]}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(err.error || `Error ${res.status}`);
            }

            const json = await res.json();
            setData(json.data || []);
            setStats(json.stats || null);
            setTabCounts(prev => ({ ...prev, [activeTab]: json.stats?.total ?? json.data?.length ?? 0 }));
        } catch (err: any) {
            console.error('[FichasViewer BQ]', err);
            setError(err.message || 'Error de conexión con BigQuery');
            toast(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [user, activeScreen, activeTab]);

    // Cargar al activar tab o al cambiar filtros
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset filtros al cambiar tab
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setFilterExtra('');
        setFilterMunicipio('');
        setSearchTerm('');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Opciones únicas para filtros (de los datos ya cargados)
    // ─────────────────────────────────────────────────────────────────────────
    const municipioOptions = stats?.municipios ?? [];

    // ─────────────────────────────────────────────────────────────────────────
    // Sync Drive
    // ─────────────────────────────────────────────────────────────────────────
    const [syncingDrive, setSyncingDrive] = useState(false);
    
    const handleSyncDrive = async () => {
        if (!filterMunicipio) {
            toast('⚠️ Selecciona un Municipio en el filtro primero para sincronizar.');
            return;
        }
        
        if (!window.confirm(`¿Sincronizar fotos desde Drive para ${filterMunicipio}? Esto puede tardar unos segundos.`)) return;
        
        setSyncingDrive(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${BASE_URL}/syncDriveToFirestore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ municipio: filterMunicipio })
            });
            
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error en la sincronización');
            
            toast(`✅ Sync completada: ${result.added} fotos agregadas, ${result.skipped} ya existían.`);
            fetchData(); // Refrescar para ver los cambios
        } catch (err: any) {
            console.error('[Sync Drive]', err);
            toast(`❌ Error sincronizando: ${err.message}`);
        } finally {
            setSyncingDrive(false);
        }
    };
    const extraOptions: string[] = Array.from(new Set(
        data.map(r => activeTab === 'pozos' ? r.Sistema : 
                      activeTab === 'marcaciones' ? r.Tipo_de_elemento : 
                      r.Material).filter(Boolean)
    )).sort();

    const cf = CARD_FIELDS[activeTab];

    // ─────────────────────────────────────────────────────────────────────────
    // Filtrado Local Instantáneo
    // ─────────────────────────────────────────────────────────────────────────
    const filteredData = React.useMemo(() => {
        return data.filter(row => {
            // Municipio
            if (filterMunicipio && String(row.Municipio || '').trim().toLowerCase() !== filterMunicipio.trim().toLowerCase()) return false;
            
            // Extra (Sistema/Tipo/Material)
            if (filterExtra) {
                const extraVal = activeTab === 'pozos' ? row.Sistema : 
                                 activeTab === 'marcaciones' ? row.Tipo_de_elemento : 
                                 row.Material;
                if (String(extraVal || '').trim().toLowerCase() !== filterExtra.trim().toLowerCase()) return false;
            }
            
            // Search
            if (debouncedSearch) {
                const term = debouncedSearch.toLowerCase();
                const v1 = String(row[cf.primary] || '').toLowerCase();
                const v2 = String(row[cf.secondary] || '').toLowerCase();
                const v3 = String(row.Barrio || row.Municipio || '').toLowerCase();
                if (!v1.includes(term) && !v2.includes(term) && !v3.includes(term)) return false;
            }
            
            return true;
        });
    }, [data, filterMunicipio, filterExtra, debouncedSearch, activeTab, cf.primary, cf.secondary]);

    const extraLabel = activeTab === 'pozos' ? 'Sistema' : activeTab === 'marcaciones' ? 'Tipo' : 'Material';

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER CARD
    // ─────────────────────────────────────────────────────────────────────────
    const { color: accentColor } = TAB_CONFIG[activeTab];

    return (
        <div className="bg-[#0d1117] text-[#E8EEFF] rounded-xl border border-[#30363d] shadow-2xl overflow-hidden">

            {/* ── SOURCE BADGE ── */}
            <div style={{
                background: 'linear-gradient(90deg,#10b98115,#3b82f615)',
                borderBottom: '1px solid #30363d',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: '#10b981'
            }}>
                <Database size={12} />
                Google BigQuery · Datos en tiempo real
            </div>

            {/* ── TABS ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', overflowX: 'auto' }}>
                {(Object.entries(TAB_CONFIG) as [TabType, typeof TAB_CONFIG[TabType]][]).map(([tab, cfg]) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        style={{
                            flex: '1 0 auto',
                            padding: '12px 8px',
                            background: activeTab === tab ? `${cfg.color}15` : 'transparent',
                            color: activeTab === tab ? cfg.color : '#64748b',
                            border: 'none',
                            borderBottom: activeTab === tab ? `2px solid ${cfg.color}` : '2px solid transparent',
                            fontWeight: 800,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {cfg.icon}
                        {cfg.label}
                        {tabCounts[tab] != null && (
                            <span style={{
                                background: activeTab === tab ? cfg.color : '#30363d',
                                color: activeTab === tab ? '#000' : '#64748b',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '9px',
                                fontWeight: 900,
                                minWidth: '20px',
                                textAlign: 'center'
                            }}>
                                {tabCounts[tab]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div style={{ padding: '14px' }}>

                {/* ── HEADER + REFRESH ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={16} style={{ color: accentColor }} />
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {filteredData.length} registros (de {stats ? stats.total : '...'})
                        </h3>
                    </div>
                    {/* DEBUG INFO */}
                    <div style={{ fontSize: '9px', color: '#f87171', padding: '2px 6px', border: '1px solid #f8717150', borderRadius: '4px' }}>
                        DEBUG: fM={filterMunicipio || 'empty'}, fE={filterExtra || 'empty'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSyncDrive}
                            disabled={syncingDrive}
                            style={{
                                background: '#161b22', border: '1px solid #30363d',
                                color: '#10b981', borderRadius: '8px', cursor: 'pointer',
                                padding: '6px 12px', display: 'flex', alignItems: 'center',
                                gap: '6px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                                opacity: syncingDrive ? 0.7 : 1
                            }}
                        >
                            {syncingDrive ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                            Sync Drive
                        </button>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            style={{
                                background: '#161b22', border: '1px solid #30363d',
                                color: accentColor, borderRadius: '8px', cursor: 'pointer',
                                padding: '6px 12px', display: 'flex', alignItems: 'center',
                                gap: '6px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refrescar
                        </button>
                    </div>
                </div>

                {/* ── SEARCH ── */}
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', background: '#161b22', border: '1px solid #30363d',
                            borderRadius: '10px', padding: '9px 14px 9px 36px',
                            color: '#E8EEFF', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* ── FILTERS ── */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <select
                        value={filterMunicipio}
                        onChange={e => setFilterMunicipio(e.target.value)}
                        style={{ padding: '7px 10px', background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#E8EEFF', fontSize: '11px', outline: 'none' }}
                    >
                        <option value="">Todos los municipios</option>
                        {municipioOptions.map((m: string) => <option key={m} value={m}>{m}</option>)}
                    </select>

                    {(activeTab === 'pozos' || activeTab === 'marcaciones') && (
                        <select
                            value={filterExtra}
                            onChange={e => setFilterExtra(e.target.value)}
                            style={{ padding: '7px 10px', background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', color: '#E8EEFF', fontSize: '11px', outline: 'none' }}
                        >
                            <option value="">Todos · {extraLabel}</option>
                            {extraOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    )}
                </div>

                {/* ── LIST ── */}
                <div style={{ maxHeight: '58vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', gap: '14px', color: '#64748b' }}>
                            <Loader2 size={30} className="animate-spin" style={{ color: accentColor }} />
                            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', margin: 0 }}>
                                Consultando BigQuery...<br /><span style={{ fontSize: '9px', fontWeight: 400 }}>~500ms estimado</span>
                            </p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px 20px', border: '2px dashed #f87171', borderRadius: '14px', textAlign: 'center', color: '#f87171' }}>
                            <p style={{ margin: '0 0 12px', fontSize: '13px' }}>⚠️ {error}</p>
                            <button onClick={fetchData} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>
                                REINTENTAR
                            </button>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div style={{ padding: '50px 20px', border: '2px dashed #30363d', borderRadius: '14px', textAlign: 'center', color: '#64748b' }}>
                            <Layers size={28} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                            <p style={{ margin: 0, fontSize: '13px' }}>Sin resultados para los filtros aplicados</p>
                        </div>
                    ) : (
                        filteredData.map((row, idx) => {
                            const rowId = row[cf.primary] ?? String(idx);
                            const isExpanded = expandedId === rowId;

                            // Campos para mostrar en detalle (excluye nulls y campos grandes)
                            const detailEntries = Object.entries(row).filter(([, v]) => v != null && String(v).length < 200);

                            return (
                                <div key={rowId}>
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : rowId)}
                                        style={{
                                            background: '#161b22',
                                            border: `1px solid ${isExpanded ? accentColor + '50' : '#30363d'}`,
                                            borderRadius: isExpanded ? '10px 10px 0 0' : '10px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                            {/* Avatar */}
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNavigateToDetail(row);
                                                }}
                                                style={{
                                                    width: '38px', height: '38px', borderRadius: '50%',
                                                    background: `${accentColor}18`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                    cursor: 'pointer',
                                                    border: `1px solid ${accentColor}30`
                                                }}
                                                title="Ver en Mapa / Detalle"
                                            >
                                                {TAB_CONFIG[activeTab].icon}
                                            </div>
                                            {/* Content */}
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 800, color: '#fff', fontSize: '13px', textTransform: 'uppercase' }}>
                                                        {fmt(row[cf.primary])}
                                                    </span>
                                                    {cf.badge1 && row[cf.badge1] && (
                                                        <span style={{ fontSize: '9px', background: '#3b82f615', color: '#60a5fa', padding: '2px 6px', borderRadius: '6px', border: '1px solid #3b82f630', fontWeight: 800 }}>
                                                            {fmt(row[cf.badge1])}
                                                        </span>
                                                    )}
                                                    {cf.badge2 && row[cf.badge2] && (
                                                        <span style={{ fontSize: '9px', background: `${accentColor}15`, color: accentColor, padding: '2px 6px', borderRadius: '6px', border: `1px solid ${accentColor}30`, fontWeight: 800 }}>
                                                            {fmt(row[cf.badge2])}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                                    {fmt(row[cf.secondary])}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: fecha / botón */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                            {row.Fecha && (
                                                <div style={{ textAlign: 'right', display: 'none' }}>
                                                    <div style={{ fontSize: '9px', color: '#475569' }}>{fmt(row.Fecha)}</div>
                                                </div>
                                            )}
                                            <ChevronRight
                                                size={16}
                                                style={{
                                                    color: isExpanded ? accentColor : '#30363d',
                                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* ── DETAIL PANEL ── */}
                                    {isExpanded && (
                                        <div style={{
                                            background: '#0d1117',
                                            border: `1px solid ${accentColor}40`,
                                            borderTop: 'none',
                                            borderRadius: '0 0 10px 10px',
                                            padding: '12px 14px',
                                            fontSize: '11px',
                                            color: '#94a3b8'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                                {detailEntries.map(([k, v]) => (
                                                    <div key={k} style={{ overflow: 'hidden' }}>
                                                        <strong style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>{k}</strong>
                                                        <span style={{ color: '#e2e8f0', fontSize: '11px' }}>{fmt(v)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Foto Gallery for Pozos */}
                                            {activeTab === 'pozos' && (
                                                <div style={{ marginTop: '16px', borderTop: '1px solid #30363d', paddingTop: '12px' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#8b949e', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ImageIcon size={12} /> Galería de Fotos (Verificación Directa)
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                                        {(() => {
                                                            try {
                                                                const fullData = row.rawData ? JSON.parse(row.rawData) : {};
                                                                const photos = fullData.fotoList || [];
                                                                if (photos.length === 0) return <div style={{ fontSize: '10px', opacity: 0.5, fontStyle: 'italic' }}>No hay fotos registradas.</div>;
                                                                return photos.map((f: any) => (
                                                                    <div key={f.id} style={{ flexShrink: 0, width: '80px', textAlign: 'center' }}>
                                                                        <div style={{ width: '80px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #30363d', marginBottom: '4px' }}>
                                                                            <ThumbnailImage foto={f} alt={f.filename} municipio={row.Municipio} />
                                                                        </div>
                                                                        <div style={{ fontSize: '7px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.filename}</div>
                                                                    </div>
                                                                ));
                                                            } catch (e) {
                                                                return <div style={{ fontSize: '10px', color: '#f87171' }}>Error cargando galería</div>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Botones de Acción */}
                                            <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
                                                
                                                {/* Botón VER EN MAPA para todos los que tengan GPS */}
                                                {(row.Latitud != null || row.Longitud != null || row.rawData) && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleNavigateToDetail(row); }}
                                                        style={{
                                                            background: 'rgba(59, 130, 246, 0.1)',
                                                            color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px',
                                                            padding: '7px 14px', fontSize: '11px', fontWeight: 800,
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <MapPin size={12} />
                                                        VER EN MAPA / DETALLE
                                                    </button>
                                                )}

                                                {/* Botones PDF solo para pozos */}
                                                {activeTab === 'pozos' && (
                                                    <>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handlePDF(row); }}
                                                            disabled={pdfLoading}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: 'white', border: 'none', borderRadius: '8px',
                                                                padding: '7px 14px', fontSize: '11px', fontWeight: 800,
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                cursor: 'pointer', opacity: pdfLoading ? 0.7 : 1,
                                                                boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                                                            }}
                                                        >
                                                            {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                                            GENERAR PDF
                                                        </button>
                                                        <PdfFastButton
                                                            pozo={row as any}
                                                            toast={toast}
                                                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── FOOTER ── */}
                <div style={{
                    paddingTop: '12px', marginTop: '12px', borderTop: '1px solid #30363d',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '9px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', background: accentColor, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                        BigQuery · {TAB_CONFIG[activeTab].label}
                    </div>
                    <span>{data.length} registros</span>
                </div>
            </div>
        </div>
    );
};

export default FichasViewer;
