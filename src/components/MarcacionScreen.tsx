import React, { useState, useEffect, useRef } from 'react';
import {
    Camera, MapPin, ChevronLeft, Save, AlertTriangle,
    Image as ImageIcon, Hash, CheckCircle2, List, Plus,
    Cloud, WifiOff, Trash2
} from 'lucide-react';
import FotoAkasoAutomatica from './FotoAkasoAutomatica';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { procesarFoto, FotoRegistro, resizeImage } from '../utils/fotoProcessor';
import { savePhotoToStorage } from '../utils/storageManager';
import GeoTracker from './GeoTracker';

const MUNICIPIOS = ['Sopó', 'Sibaté', 'Granada', 'Marinilla'];
const TIPOS = ['pozo de inspección', 'aliviadero', 'descarga', 'caja de inspección', 'sumidero', 'OTRO'];

interface SavedMarcacion {
    codigo: string;
    tipoElemento: string;
    municipio: string;
    gps: { lat: number | null; lng: number | null; precision: number | null };
    alturaTotal: string;
    obs: string;
    inspector: string;
    createdAt: string;
    synced: boolean;
    fotos: {
        panoramica: any | null;
        tapa: any | null;
        batea?: any | null;
    };
}

interface FormState {
    codigo: string;
    tipoElemento: string;
    otroTipo: string;
    municipio: string;
    gps: { lat: number | null; lng: number | null; precision: number | null };
    alturaTotal: string;
    fotos: { panoramica: any | null; tapa: any | null; batea?: any | null };
    obs: string;
}

const EMPTY_FORM = (municipio: string): FormState => ({
    codigo: '',
    tipoElemento: 'pozo de inspección',
    otroTipo: '',
    municipio,
    gps: { lat: null, lng: null, precision: null },
    alturaTotal: '',
    fotos: { panoramica: null, tapa: null, batea: null },
    obs: '',
});

/* ── Guardar en local storage ── */
const saveLocal = (data: SavedMarcacion) => {
    const existing: SavedMarcacion[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
    const idx = existing.findIndex(m => m.codigo === data.codigo && m.municipio === data.municipio);
    if (idx >= 0) existing[idx] = data;
    else existing.push(data);
    localStorage.setItem('marcaciones_star', JSON.stringify(existing));
};

/* ── Intentar sync con Firestore (en background) ── */
const trySyncFirestore = async (data: SavedMarcacion) => {
    try {
        const path = `marcaciones/${data.municipio.toUpperCase()}_${data.codigo}`;
        await setDoc(doc(db, path), { ...data, lastSync: new Date().toISOString() });
        // Marcar como synced en local
        const existing: SavedMarcacion[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
        const idx = existing.findIndex(m => m.codigo === data.codigo && m.municipio === data.municipio);
        if (idx >= 0) { existing[idx].synced = true; localStorage.setItem('marcaciones_star', JSON.stringify(existing)); }
        return true;
    } catch (e) {
        console.warn('Firestore sync failed (will retry later):', e);
        return false;
    }
};

/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════ */
const MarcacionScreen: React.FC<{
    user: any;
    onBack: () => void;
    onSuccess: (msg: string) => void;
}> = ({ user, onBack, onSuccess }) => {
    const defaultMun = (window as any).CURRENT_MUNICIPIO || 'Sopó';
    const [view, setView] = useState<'list' | 'form'>('list');
    const [form, setForm] = useState<FormState>(EMPTY_FORM(defaultMun));
    const [records, setRecords] = useState<SavedMarcacion[]>([]);
    const [showGeoTracker, setShowGeoTracker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    /* ── Cargar historial local ── */
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('marcaciones_star') || '[]') as any[];
        setRecords(saved.filter((r: any) => !r.deleted));
    }, []);

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    /* ── Reintentar sync cuando hay conexión ── */
    useEffect(() => {
        if (!isOnline) return;
        const pending = records.filter(r => !r.synced);
        pending.forEach(r => trySyncFirestore(r).then(ok => {
            if (ok) setRecords(prev => prev.map(p => p.codigo === r.codigo ? { ...p, synced: true } : p));
        }));
    }, [isOnline]);

    const updateForm = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }));

    /* ── Captura foto ── */
    const isSumidero = form.tipoElemento === 'sumidero';

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, category: 'panoramica' | 'tapa' | 'batea') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const rawCodigo = form.codigo.trim().toUpperCase().replace(/\s+/g, '');
        const prefix = category === 'panoramica' ? 'P' : category === 'tapa' ? 'T' : 'BE';
        const filename = rawCodigo ? `${rawCodigo}-${prefix}.JPG` : `MARC-${Date.now()}-${prefix}.JPG`;
        try {
            const base64 = await resizeImage(file, 1600, 1600, 0.7);
            const newFoto = procesarFoto(filename, rawCodigo || 'MARC', base64);
            await savePhotoToStorage({
                id: newFoto.id, pozoId: rawCodigo || 'MARC', municipio: form.municipio,
                barrio: 'MARCACION', filename, blob: base64,
                categoria: category === 'panoramica' ? 'General' : category === 'tapa' ? 'Interior' : 'Sumidero',
                inspector: user?.name || 'Desconocido', timestamp: Date.now(), synced: false
            });
            updateForm({ fotos: { ...form.fotos, [category]: { ...newFoto, blobId: base64 } } });
        } catch (err) {
            console.error('Error capturando foto:', err);
            alert('Error al procesar la foto.');
        }
    };

    const handleAkasoSuccess = (cat: 'panoramica' | 'tapa' | 'batea', foto: any) => {
        updateForm({ fotos: { ...form.fotos, [cat]: foto } });
    };

    /* ── Validar ── */
    const validate = (): string[] => {
        const errs: string[] = [];
        if (!form.codigo.trim()) errs.push('Código del elemento es obligatorio');
        if (!form.gps.lat) errs.push('Debes fijar la ubicación GPS en el mapa');
        if (!form.fotos.panoramica) errs.push('Falta foto Panorámica (-P)');
        if (!form.fotos.tapa) errs.push('Falta foto de Tapa (-T)');
        if (form.tipoElemento === 'sumidero' && !form.fotos.batea) errs.push('Falta foto de Batea de Entrada (-BE) — obligatoria para sumideros');
        return errs;
    };

    /* ── Guardar: LOCAL primero, Firestore en background ── */
    const handleSave = async () => {
        const errs = validate();
        if (errs.length) { setErrors(errs); return; }
        setErrors([]);
        setLoading(true);

        const codigo = form.codigo.trim().toUpperCase().replace(/\s+/g, '');
        const finalType = form.tipoElemento === 'OTRO' ? form.otroTipo : form.tipoElemento;

        const dataToSave: SavedMarcacion = {
            codigo,
            tipoElemento: finalType,
            municipio: form.municipio,
            gps: form.gps,
            alturaTotal: form.alturaTotal.trim(),
            obs: form.obs,
            fotos: form.fotos,
            inspector: user?.name || user?.email || 'Desconocido',
            createdAt: new Date().toISOString(),
            synced: false,
        };

        // 1️⃣ Guardar LOCAL siempre (no falla)
        saveLocal(dataToSave);
        const updated = JSON.parse(localStorage.getItem('marcaciones_star') || '[]') as SavedMarcacion[];
        setRecords(updated.filter((r: any) => !r.deleted));

        // 2️⃣ Intentar Firestore en background
        if (isOnline) {
            trySyncFirestore(dataToSave).then(ok => {
                if (ok) setRecords(prev => prev.map(r => r.codigo === codigo ? { ...r, synced: true } : r));
            });
        }

        setLoading(false);
        onSuccess(`✅ Marcación "${codigo}" guardada localmente`);
        setForm(EMPTY_FORM(form.municipio)); // Resetear formulario
        setView('list'); // Volver al listado
    };

    /* ── Eliminar registro ── */
    const handleDelete = (codigo: string, mun: string) => {
        if (!confirm(`¿Eliminar marcación ${codigo}?`)) return;
        const existing: SavedMarcacion[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
        const updated = existing.filter(r => !(r.codigo === codigo && r.municipio === mun));
        localStorage.setItem('marcaciones_star', JSON.stringify(updated));
        setRecords(updated);
    };

    /* ════════  RENDER  ════════ */
    return (
        <div className="screen active">
            {/* Header */}
            <header className="app-header">
                <div className="header-inner">
                    <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <div className="header-titles">
                        <div className="header-title">Actividad Marcación</div>
                        <div className="header-sub" style={{ color: 'var(--blue)' }}>
                            {view === 'list' ? `${records.length} elemento(s) registrado(s)` : 'Nuevo Registro'}
                        </div>
                    </div>
                    {view === 'list' ? (
                        <button
                            onClick={() => { setForm(EMPTY_FORM(defaultMun)); setErrors([]); setView('form'); }}
                            className="btn btn-blue btn-sm"
                            style={{ padding: '8px 14px', fontSize: '12px', marginLeft: 'auto' }}
                        >
                            <Plus size={15} /> Nuevo
                        </button>
                    ) : (
                        <button
                            onClick={() => setView('list')}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '8px 14px', fontSize: '12px', marginLeft: 'auto', color: 'var(--text2)' }}
                        >
                            <List size={15} /> Lista
                        </button>
                    )}
                </div>
            </header>

            {/* ──────── VISTA: LISTADO ──────── */}
            {view === 'list' && (
                <div className="content">
                    {records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
                            <MapPin size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
                            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Sin marcaciones aún</div>
                            <div style={{ fontSize: '12px', marginBottom: '24px' }}>Toca "+ Nuevo" para registrar un elemento</div>
                            <button
                                className="btn btn-blue"
                                onClick={() => { setForm(EMPTY_FORM(defaultMun)); setErrors([]); setView('form'); }}
                            >
                                <Plus size={16} /> Crear primera marcación
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {records.slice().reverse().map((r, i) => (
                                <div
                                    key={`${r.codigo}-${i}`}
                                    className="card"
                                    style={{ borderLeft: `3px solid ${r.synced ? 'var(--green)' : 'var(--yellow)'}`, padding: '14px 16px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        {/* Miniatura panorámica */}
                                        {r.fotos?.panoramica?.blobId ? (
                                            <img
                                                src={r.fotos.panoramica.blobId}
                                                alt="panoramica"
                                                style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                                            />
                                        ) : (
                                            <div style={{ width: '56px', height: '56px', background: 'var(--bg3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <ImageIcon size={20} style={{ color: 'var(--text3)' }} />
                                            </div>
                                        )}
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '1px' }}>
                                                    {r.codigo}
                                                </span>
                                                {r.synced ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'var(--green)', fontWeight: '700' }}>
                                                        <Cloud size={11} /> Synced
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'var(--yellow)', fontWeight: '700' }}>
                                                        <WifiOff size={11} /> Pendiente
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.tipoElemento}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                                                📍 {r.municipio} &nbsp;·&nbsp; 📅 {new Date(r.createdAt).toLocaleDateString('es-CO')}
                                            </div>
                                            {r.alturaTotal && (
                                                <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: '3px' }}>
                                                    📏 Altura total: <strong style={{ color: '#a78bfa' }}>{r.alturaTotal} m</strong>
                                                </div>
                                            )}
                                            {r.gps.lat && (
                                                <div style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace', marginTop: '2px' }}>
                                                    {r.gps.lat.toFixed(5)}, {r.gps.lng?.toFixed(5)}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                {r.fotos?.panoramica && (
                                                    <span style={{ fontSize: '9px', background: 'rgba(0,132,255,0.15)', color: '#60a5fa', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontWeight: '700' }}>-P ✓</span>
                                                )}
                                                {r.fotos?.tapa && (
                                                    <span style={{ fontSize: '9px', background: 'rgba(0,200,150,0.15)', color: 'var(--green)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontWeight: '700' }}>-T ✓</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Eliminar */}
                                        <button
                                            onClick={() => handleDelete(r.codigo, r.municipio)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ──────── VISTA: FORMULARIO ──────── */}
            {view === 'form' && (
                <div className="content">

                    {/* 1. Código */}
                    <div className="card" style={{ borderColor: form.codigo ? 'var(--green)' : 'rgba(255,69,96,0.4)', borderWidth: '1.5px' }}>
                        <div className="card-title" style={{ color: form.codigo ? 'var(--green)' : 'var(--red)' }}>
                            <Hash size={16} /> Código del Elemento *
                        </div>
                        <input
                            type="text"
                            placeholder="Ej: P-007, S-003, D-012..."
                            value={form.codigo}
                            onChange={e => updateForm({ codigo: e.target.value.toUpperCase() })}
                            style={{
                                fontSize: '22px', fontWeight: '800', fontFamily: "'DM Mono', monospace",
                                textAlign: 'center', color: form.codigo ? 'var(--green)' : 'inherit',
                                letterSpacing: '2px', background: 'var(--bg3)', border: '1.5px solid var(--border2)',
                                borderRadius: '12px', padding: '14px', width: '100%', boxSizing: 'border-box'
                            }}
                        />
                        {form.codigo && (
                            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '10px', color: 'var(--text3)' }}>
                                Fotos: <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{form.codigo}-P.JPG</strong>
                                &nbsp;·&nbsp;
                                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{form.codigo}-T.JPG</strong>
                            </div>
                        )}
                    </div>

                    {/* 2. Municipio */}
                    <div className="card">
                        <div className="card-title">Municipio</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {MUNICIPIOS.map(m => (
                                <button key={m} onClick={() => updateForm({ municipio: m })} style={{
                                    padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                    border: `1.5px solid ${form.municipio === m ? 'var(--blue)' : 'var(--border2)'}`,
                                    background: form.municipio === m ? 'rgba(0,132,255,0.15)' : 'var(--bg3)',
                                    color: form.municipio === m ? '#60a5fa' : 'var(--text2)'
                                }}>{m}</button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Tipo */}
                    <div className="card">
                        <div className="card-title">Tipo de Elemento</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {TIPOS.map(t => (
                                <button key={t} onClick={() => updateForm({ tipoElemento: t })} style={{
                                    padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                                    cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                                    border: `1.5px solid ${form.tipoElemento === t ? 'var(--blue)' : 'var(--border2)'}`,
                                    background: form.tipoElemento === t ? 'rgba(0,132,255,0.15)' : 'var(--bg3)',
                                    color: form.tipoElemento === t ? '#60a5fa' : 'var(--text2)'
                                }}>{t === 'OTRO' ? 'OTRO...' : t}</button>
                            ))}
                        </div>
                        {form.tipoElemento === 'OTRO' && (
                            <div className="field" style={{ marginTop: '12px' }}>
                                <input type="text" placeholder="Especificar tipo..." value={form.otroTipo}
                                    onChange={e => updateForm({ otroTipo: e.target.value })} />
                            </div>
                        )}
                    </div>

                    {/* 4. GPS */}
                    <div className="card">
                        <div className="card-title" style={{ color: 'var(--green)' }}><MapPin size={16} /> Georreferenciación</div>
                        <button
                            className={`btn btn-full ${form.gps.lat ? 'btn-ghost' : 'btn-blue'}`}
                            onClick={() => setShowGeoTracker(true)}
                            style={form.gps.lat ? { borderColor: 'var(--green)', color: 'var(--green)' } : {}}
                        >
                            <MapPin size={18} /> {form.gps.lat ? 'Modificar Ubicación' : 'Fijar en Mapa'}
                        </button>
                        {form.gps.lat && (
                            <div className="gps-result show" style={{ textAlign: 'center', margin: '12px auto 0' }}>
                                <div style={{ fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
                                    {form.gps.lat.toFixed(6)}, {form.gps.lng?.toFixed(6)}
                                </div>
                                <div>Precisión: ±{form.gps.precision}m</div>
                            </div>
                        )}
                    </div>

                    {/* 4b. Altura Total */}
                    <div className="card" style={{ borderColor: form.alturaTotal ? 'rgba(167,139,250,0.5)' : 'var(--border2)', borderWidth: '1.5px' }}>
                        <div className="card-title" style={{ color: form.alturaTotal ? '#a78bfa' : 'var(--text2)' }}>
                            📏 Altura Total del Elemento
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={form.alturaTotal}
                                onChange={e => updateForm({ alturaTotal: e.target.value })}
                                style={{
                                    flex: 1,
                                    fontSize: '26px', fontWeight: '800', fontFamily: "'DM Mono', monospace",
                                    textAlign: 'center', color: form.alturaTotal ? '#a78bfa' : 'inherit',
                                    background: 'var(--bg3)', border: `1.5px solid ${form.alturaTotal ? 'rgba(167,139,250,0.5)' : 'var(--border2)'}`,
                                    borderRadius: '12px', padding: '14px', boxSizing: 'border-box'
                                }}
                            />
                            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text2)', whiteSpace: 'nowrap' }}>m</span>
                        </div>
                        {form.alturaTotal && (
                            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text3)' }}>
                                Altura registrada: <strong style={{ color: '#a78bfa' }}>{parseFloat(form.alturaTotal).toFixed(2)} metros</strong>
                            </div>
                        )}
                    </div>

                    {/* 5. Fotos */}
                    <div className="card">
                        <div className="card-title">Evidencia Fotográfica</div>
                        <div className="field-row" style={{ gap: '16px' }}>
                            {(['panoramica', 'tapa'] as const).map(cat => {
                                const label = cat === 'panoramica' ? 'Panorámica' : 'Foto Tapa';
                                const suffix = cat === 'panoramica' ? '-P' : '-T';
                                const foto = form.fotos[cat];
                                return (
                                    <div key={cat} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', color: foto ? 'var(--green)' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {label} <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{suffix}</span>
                                            {foto && <CheckCircle2 size={12} style={{ display: 'inline', color: 'var(--green)' }} />}
                                            <FotoAkasoAutomatica
                                                pozoId={form.codigo.trim().toUpperCase() || 'MARC'}
                                                filename={form.codigo.trim() ? `${form.codigo.trim().toUpperCase()}${suffix}.JPG` : `MARC-${Date.now()}${suffix}.JPG`}
                                                categoria={cat === 'panoramica' ? 'General' : 'Interior'}
                                                onSuccess={(f) => handleAkasoSuccess(cat, f)}
                                            />
                                        </div>
                                        <div className="photo-zone" style={{ height: '120px', position: 'relative' }}>
                                            <input type="file" accept="image/*" onChange={e => handlePhoto(e, cat)}
                                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                                            {foto ? (
                                                <img src={foto.blobId} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                            ) : (
                                                <><div className="pz-icon"><ImageIcon size={24} /></div><div className="pz-label">Galería</div></>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4b. Condicional Sumideros: Foto Batea de Entrada */}
                    {isSumidero && (
                        <div className="card" style={{
                            borderColor: form.fotos.batea ? 'var(--green)' : 'rgba(255,165,0,0.5)',
                            borderWidth: '1.5px',
                            background: 'rgba(255,140,0,0.05)'
                        }}>
                            <div className="card-title" style={{ color: 'orange', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚠️ Sumidero — Foto Batea de Entrada
                                {form.fotos.batea && <CheckCircle2 size={14} style={{ color: 'var(--green)', display: 'inline' }} />}
                                <FotoAkasoAutomatica
                                    pozoId={form.codigo.trim().toUpperCase() || 'MARC'}
                                    filename={form.codigo.trim() ? `${form.codigo.trim().toUpperCase()}-BE.JPG` : `MARC-${Date.now()}-BE.JPG`}
                                    categoria="Sumidero"
                                    onSuccess={(f) => handleAkasoSuccess('batea', f)}
                                />
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '10px', lineHeight: '1.5' }}>
                                Obligatorio: Captura la foto interna de la <strong style={{ color: 'var(--text2)' }}>batea de la entrada</strong> del sumidero.
                                El archivo se guardará como <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{form.codigo || 'CÓDIGO'}-BE.JPG</span>
                            </div>
                            <div className="photo-zone" style={{ height: '150px', position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handlePhoto(e, 'batea')}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                />
                                {form.fotos.batea ? (
                                    <img
                                        src={form.fotos.batea.blobId}
                                        alt="Batea entrada"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                    />
                                ) : (
                                    <>
                                        <div className="pz-icon"><ImageIcon size={28} style={{ color: 'orange' }} /></div>
                                        <div className="pz-label" style={{ color: 'orange' }}>Foto Batea (-BE)</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 6. Observaciones */}
                    <div className="card">
                        <div className="card-title">Observaciones (opcional)</div>
                        <textarea rows={3} placeholder="Notas sobre el elemento..." value={form.obs}
                            onChange={e => updateForm({ obs: e.target.value })}
                            style={{ width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border2)', borderRadius: '10px', color: 'var(--text1)', padding: '10px 12px', fontSize: '13px', resize: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                    </div>

                    {/* Errores */}
                    {errors.length > 0 && (
                        <div style={{ background: 'rgba(255,69,96,0.1)', border: '1px solid var(--red)', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                            {errors.map((e, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red)', fontSize: '12px', marginBottom: '4px' }}>
                                    <AlertTriangle size={13} /> {e}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Botón guardar */}
                    <button
                        className="btn btn-green btn-full"
                        onClick={handleSave}
                        disabled={loading}
                        style={{ marginTop: '8px', marginBottom: '24px', fontSize: '15px', fontWeight: '800' }}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black" style={{ display: 'inline-block' }} />
                        ) : (
                            <>
                                <Save size={18} />
                                Guardar Marcación
                                {form.codigo && <span style={{ fontSize: '12px', opacity: 0.8, marginLeft: '6px' }}>· {form.codigo}</span>}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* GeoTracker */}
            {showGeoTracker && (
                <GeoTracker
                    initialCoords={{ lat: form.gps.lat || 4.908, lng: form.gps.lng || -73.948 }}
                    pozoId={form.codigo || 'MARC'}
                    onClose={() => setShowGeoTracker(false)}
                    onConfirm={(c) => { updateForm({ gps: c }); setShowGeoTracker(false); }}
                    onScreenshot={async (foto) => {
                        await savePhotoToStorage({
                            id: foto.id, pozoId: form.codigo || 'MARC', municipio: form.municipio,
                            barrio: 'MARCACION', filename: foto.filename, blob: (foto as any).blobId,
                            categoria: 'General', inspector: user?.name || 'Desconocido',
                            timestamp: Date.now(), synced: false
                        });
                    }}
                />
            )}
        </div>
    );
};

export default MarcacionScreen;
