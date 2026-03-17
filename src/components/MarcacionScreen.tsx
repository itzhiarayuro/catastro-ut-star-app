import React, { useState, useEffect, useRef } from 'react';
import {
    Camera, MapPin, ChevronLeft, Save, AlertTriangle,
    Image as ImageIcon, Hash, CheckCircle2, List, Plus,
    Cloud, WifiOff, Trash2, Edit2
} from 'lucide-react';
import FotoAkasoAutomatica from './FotoAkasoAutomatica';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { procesarFoto, FotoRegistro, resizeImage, stripBinaryData } from '../utils/fotoProcessor';
import { savePhotoToStorage, getPhotoFromStorage } from '../utils/storageManager';
import GeoTracker from './SmartGeoTracker';

const MUNICIPIOS = ['Sopó', 'Sibaté', 'Granada', 'Marinilla'];
const TIPOS = ['pozo de inspección', 'aliviadero', 'descarga', 'caja de inspección', 'sumidero', 'OTRO'];

export interface SavedMarcacion {
    codigo: string;
    tipoElemento: string;
    municipio: string;
    gps: { lat: number | null; lng: number | null; precision: number | null };
    obs: string;
    inspector: string;
    createdAt: string;
    synced: boolean;
    deleted?: boolean;
    fotos: {
        panoramica: any | null;
        tapa: any | null;
        interna?: any | null;
        batea?: any | null;
        puntoGPS?: any | null;
    };
}

interface FormState {
    codigo: string;
    tipoElemento: string;
    otroTipo: string;
    municipio: string;
    gps: { lat: number | null; lng: number | null; precision: number | null };
    fotos: { panoramica: any | null; tapa: any | null; interna?: any | null; batea?: any | null; puntoGPS?: any | null };
    obs: string;
}

const EMPTY_FORM = (municipio: string): FormState => ({
    codigo: '',
    tipoElemento: 'pozo de inspección',
    otroTipo: '',
    municipio,
    gps: { lat: null, lng: null, precision: null },
    fotos: { panoramica: null, tapa: null, interna: null, batea: null, puntoGPS: null },
    obs: '',
});

/* ── Quitar fotos pesadas antes de guardar en localStorage ── */
const stripPhotos = (data: SavedMarcacion): SavedMarcacion => {
    const clean = JSON.parse(JSON.stringify(data));
    if (clean.fotos) {
        Object.keys(clean.fotos).forEach(k => {
            if (clean.fotos[k]) delete clean.fotos[k].blobId;
        });
    }
    return clean;
};

/* ── Guardar en local storage (Sin fotos pesadas) ── */
const saveLocal = (data: SavedMarcacion) => {
    const existing: SavedMarcacion[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
    const cleanData = stripPhotos(data);
    const idx = existing.findIndex(m => m.createdAt === data.createdAt);
    if (idx >= 0) existing[idx] = cleanData;
    else existing.push(cleanData);
    localStorage.setItem('marcaciones_star', JSON.stringify(existing));
};

/* ── Intentar sync con Firestore (Sin fotos pesadas) ── */
const trySyncFirestore = async (data: SavedMarcacion) => {
    try {
        const cleanData = stripBinaryData(data);

        const path = `marcaciones/${data.municipio.toUpperCase()}_${data.codigo}`;
        const historyPath = `historial_marcaciones/${data.municipio.toUpperCase()}_${data.codigo}_${Date.now()}`;

        // 1. Guardar en Master
        await setDoc(doc(db, path), { ...cleanData, synced: true, lastSync: new Date().toISOString() });

        // 2. Guardar en Historial (Espejo / Mirror)
        await setDoc(doc(db, historyPath), {
            ...cleanData,
            synced: true,
            tipoRegistro: 'HISTORIAL',
            timestamp_mirror: Date.now()
        });

        // Marcar como synced en local (manteniendo el estado limpio)
        const existing: SavedMarcacion[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
        const idx = existing.findIndex(m => m.createdAt === data.createdAt);
        if (idx >= 0) {
            existing[idx].synced = true;
            localStorage.setItem('marcaciones_star', JSON.stringify(existing));
        }
        return true;
    } catch (e) {
        console.warn('Firestore sync failed (will retry later):', e);
        return false;
    }
};

/* ── Componente para mostrar imagen desde IDB si no tiene blobId ── */
const HydratedImage: React.FC<{ foto: any, alt: string, style?: any, fallback?: any }> = ({ foto, alt, style, fallback }) => {
    const [src, setSrc] = useState<string | null>(foto?.blobId || null);
    const [loading, setLoading] = useState(!foto?.blobId && !!foto?.id);

    useEffect(() => {
        if (!foto?.blobId && foto?.id) {
            setLoading(true);
            getPhotoFromStorage(foto.id).then(p => {
                if (p) setSrc(p.blob);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setSrc(foto?.blobId || null);
            setLoading(false);
        }
    }, [foto?.id, foto?.blobId]);

    if (loading) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)' }}><div className="spinner-small" /></div>;
    if (!src) return fallback || null;
    return <img src={src} alt={alt} style={style} />;
};

/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════ */
const MarcacionScreen: React.FC<{
    user: any;
    mode: 'PZ' | 'SUMIDERO';
    onBack: () => void;
    onSync: () => void;
    onSuccess: (msg: string) => void;
}> = ({ user, mode, onBack, onSync, onSuccess }) => {
    const defaultMun = (window as any).CURRENT_MUNICIPIO || 'Sopó';
    const [view, setView] = useState<'list' | 'form'>('list');
    const [form, setForm] = useState<FormState>(() => {
        const base = EMPTY_FORM(defaultMun);
        if (mode === 'SUMIDERO') base.tipoElemento = 'sumidero';
        return base;
    });
    const [records, setRecords] = useState<SavedMarcacion[]>([]);
    const [showGeoTracker, setShowGeoTracker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [creationDate, setCreationDate] = useState<string | null>(null);
    const [deleteItem, setDeleteItem] = useState<{ codigo: string, mun: string, createdAt: string } | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
            if (ok) setRecords(prev => prev.map(p => p.createdAt === r.createdAt ? { ...p, synced: true } : p));
        }));
    }, [isOnline]);

    const resetForm = () => {
        const base = EMPTY_FORM(defaultMun);
        if (mode === 'SUMIDERO') base.tipoElemento = 'sumidero';
        setForm(base);
        setErrors([]);
        setCreationDate(null);
    };

    const [syncingAll, setSyncingAll] = useState(false);
    const syncAllPending = async () => {
        if (syncingAll || !isOnline) return;
        const pending = records.filter(r => !r.synced);
        if (pending.length === 0) return;

        setSyncingAll(true);
        let count = 0;
        for (const r of pending) {
            const ok = await trySyncFirestore(r);
            if (ok) count++;
        }

        if (count > 0) {
            const saved = JSON.parse(localStorage.getItem('marcaciones_star') || '[]') as any[];
            setRecords(saved.filter((r: any) => !r.deleted));
            onSuccess(`✅ Se sincronizaron ${count} registros pendientes.`);
        } else {
            alert('❌ No se pudo sincronizar. Verifica tu conexión a internet.');
        }
        setSyncingAll(false);
    };

    const updateForm = (upd: Partial<FormState>) => setForm(prev => ({ ...prev, ...upd }));

    const handleEdit = (record: SavedMarcacion) => {
        setForm({
            codigo: record.codigo,
            tipoElemento: record.tipoElemento,
            municipio: record.municipio,
            gps: record.gps,
            obs: record.obs,
            fotos: record.fotos || { panoramica: null, tapa: null, puntoGPS: null, batea: null, interna: null },
            otroTipo: TIPOS.includes(record.tipoElemento) ? '' : record.tipoElemento
        });
        setCreationDate(record.createdAt);
        setErrors([]);
        setView('form');
    };

    useEffect(() => {
        resetForm();
        setView('list');
    }, [mode]);

    /* ── Captura foto ── */
    const isSumidero = form.tipoElemento === 'sumidero';

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, cat: keyof FormState['fotos']) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const rawCodigo = form.codigo.trim().toUpperCase().replace(/\s+/g, '');
        const prefix = cat === 'panoramica' ? 'P' : cat === 'tapa' ? 'T' : cat === 'interna' ? 'I' : cat === 'batea' ? 'BE' : 'GPS';
        const filename = rawCodigo ? `${rawCodigo}-${prefix}.JPG` : `MARC-${Date.now()}-${prefix}.JPG`;
        try {
            const base64 = await resizeImage(file, 1600, 1600, 0.7);
            const newFoto = procesarFoto(filename, rawCodigo || 'MARC', base64);
            const catString = cat === 'panoramica' ? 'General' : cat === 'tapa' ? 'Interior' : (cat === 'puntoGPS') ? 'Plano/Mapa' as any : (cat === 'batea' || cat === 'interna') ? 'Sumidero' : 'General';
            await savePhotoToStorage({
                id: newFoto.id, pozoId: rawCodigo || 'MARC', municipio: form.municipio,
                barrio: 'MARCACION', filename, blob: base64,
                categoria: catString,
                inspector: user?.name || 'Desconocido', timestamp: Date.now(), synced: false
            });
            updateForm({ fotos: { ...form.fotos, [cat]: { ...newFoto, blobId: base64 } } });
        } catch (err) {
            console.error('Error capturando foto:', err);
            alert('Error al procesar la foto.');
        }
    };

    const handleAkasoSuccess = (cat: keyof FormState['fotos'], foto: any) => {
        updateForm({ fotos: { ...form.fotos, [cat]: foto } });
    };

    /* ── Validar ── */
    const validate = (): string[] => {
        const errs: string[] = [];
        if (!form.codigo.trim()) errs.push('Código del elemento es obligatorio');
        if (!form.gps.lat) errs.push('Debes fijar la ubicación GPS en el mapa');
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
            obs: form.obs,
            fotos: form.fotos,
            inspector: user?.name || user?.email || 'Desconocido',
            createdAt: creationDate || new Date().toISOString(),
            synced: false,
        };

        // 1️⃣ Guardar LOCAL siempre (no falla)
        saveLocal(dataToSave);
        const updated = JSON.parse(localStorage.getItem('marcaciones_star') || '[]') as SavedMarcacion[];
        setRecords(updated.filter((r: any) => !r.deleted));

        // 2️⃣ Intentar Firestore en background
        if (isOnline) {
            trySyncFirestore(dataToSave).then(ok => {
                if (ok) setRecords(prev => prev.map(r => r.createdAt === dataToSave.createdAt ? { ...r, synced: true } : r));
            });
        }

        setLoading(false);
        onSuccess(`✅ Marcación "${codigo}" guardada localmente`);
        resetForm(); // Resetear formulario correctamente según el modo
        setView('list'); // Volver al listado
    };

    /* ── Eliminar registro con confirmación segura ── */
    const handleDelete = (codigo: string, mun: string, createdAt: string) => {
        setDeleteItem({ codigo, mun, createdAt });
        setDeleteConfirmText('');
    };

    const confirmDelete = () => {
        if (deleteConfirmText.toUpperCase() !== 'ELIMINAR') {
            alert('Por favor escribe ELIMINAR para confirmar');
            return;
        }
        if (!deleteItem) return;

        const existing: SavedMarcacion[] = JSON.parse(localStorage.getItem('marcaciones_star') || '[]');
        const idx = existing.findIndex(r => r.createdAt === deleteItem.createdAt);

        if (idx >= 0) {
            // Soft Delete: Marcamos como borrado en lugar de eliminar del array
            existing[idx] = {
                ...existing[idx],
                deleted: true,
                synced: false // Forzamos resync para que la nube sepa que se borró (si implementamos sync de borrados)
            };
            localStorage.setItem('marcaciones_star', JSON.stringify(existing));
            setRecords(existing.filter(r => !r.deleted));
        }

        setDeleteItem(null);
        setDeleteConfirmText('');
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
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={onSync}
                                className="btn btn-blue btn-sm"
                                style={{
                                    padding: '8px 14px',
                                    fontSize: '12px',
                                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                    border: 'none'
                                }}
                            >
                                <Cloud size={15} /> Sincronizar
                            </button>
                            <button
                                onClick={() => { resetForm(); setView('form'); }}
                                className="btn btn-blue btn-sm"
                                style={{ padding: '8px 14px', fontSize: '12px' }}
                            >
                                <Plus size={15} /> Nuevo
                            </button>
                        </div>
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
                                onClick={() => { resetForm(); setView('form'); }}
                            >
                                <Plus size={16} /> Crear primera marcación
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Botón de Emergencia si hay pendientes */}
                            {records.some(r => !r.synced) && (
                                <button
                                    onClick={syncAllPending}
                                    disabled={syncingAll || !isOnline}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: isOnline ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)',
                                        border: `1px dashed ${isOnline ? 'var(--yellow)' : 'var(--text3)'}`,
                                        borderRadius: '12px',
                                        color: isOnline ? 'var(--yellow)' : 'var(--text3)',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        marginBottom: '6px',
                                        cursor: isOnline ? 'pointer' : 'not-allowed',
                                        opacity: syncingAll ? 0.7 : 1
                                    }}
                                >
                                    {syncingAll ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-yellow-500" style={{ display: 'inline-block' }} />
                                            Sincronizando...
                                        </>
                                    ) : (
                                        <>
                                            <Cloud size={16} />
                                            {isOnline ? `⚠️ HAY ${records.filter(r => !r.synced).length} PENDIENTES - TOCAR PARA SUBIR` : '⚠️ CONÉCTATE PARA SUBIR PENDIENTES'}
                                        </>
                                    )}
                                </button>
                            )}

                            {records.slice().reverse().map((r, i) => (
                                <div
                                    key={r.createdAt}
                                    className="card"
                                    style={{ borderLeft: `3px solid ${r.synced ? 'var(--green)' : 'var(--yellow)'}`, padding: '14px 16px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        {/* Miniatura panorámica */}
                                        <HydratedImage
                                            foto={r.fotos?.panoramica}
                                            alt="panoramica"
                                            style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                                            fallback={
                                                <div style={{ width: '56px', height: '56px', background: 'var(--bg3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <ImageIcon size={20} style={{ color: 'var(--text3)' }} />
                                                </div>
                                            }
                                        />
                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '1px' }}>
                                                    {r.codigo}
                                                </span>
                                                <span style={{ fontSize: '9px', background: r.tipoElemento === 'sumidero' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: r.tipoElemento === 'sumidero' ? '#34d399' : '#fbbf24', borderRadius: '4px', padding: '1px 5px', fontWeight: '800' }}>
                                                    {r.tipoElemento.toUpperCase()}
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
                                            {r.gps.lat && (
                                                <div style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'monospace', marginTop: '2px' }}>
                                                    {r.gps.lat.toFixed(5)}, {r.gps.lng?.toFixed(5)}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                {r.fotos?.panoramica && (
                                                    <span style={{ fontSize: '9px', background: 'rgba(0,132,255,0.15)', color: '#60a5fa', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontWeight: '700' }}>-P ✓</span>
                                                )}
                                                {r.fotos?.tapa && (
                                                    <span style={{ fontSize: '9px', background: 'rgba(0,200,150,0.15)', color: 'var(--green)', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontWeight: '700' }}>-T ✓</span>
                                                )}
                                                {r.fotos?.interna && (
                                                    <span style={{ fontSize: '9px', background: 'rgba(255,100,255,0.15)', color: '#ff64ff', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontWeight: '700' }}>-I ✓</span>
                                                )}
                                                {r.fotos?.puntoGPS && (
                                                    <span style={{ fontSize: '9px', background: 'rgba(255,165,0,0.15)', color: 'orange', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontWeight: '700' }}>-GPS ✓</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button
                                                onClick={() => handleEdit(r)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(r.codigo, r.municipio, r.createdAt)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
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

                    {/* 3. Tipo (Solo si NO es Sumidero) */}
                    {mode !== 'SUMIDERO' && (
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
                    )}

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

                    {/* 5. Fotos */}
                    <div className="card">
                        <div className="card-title">Evidencia Básica</div>
                        <div className="field-row" style={{ gap: '16px', marginBottom: '16px' }}>
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
                                            <HydratedImage
                                                foto={foto}
                                                alt={label}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                                fallback={<><div className="pz-icon"><ImageIcon size={24} /></div><div className="pz-label">Galería</div></>}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="card-title" style={{ marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>Evidencia Opcional</div>
                        <div className="field-row" style={{ gap: '16px' }}>
                            {(isSumidero ? (['interna', 'puntoGPS'] as const) : (['puntoGPS'] as const)).map(cat => {
                                const label = cat === 'puntoGPS' ? 'Punto GPS' : 'Foto Interna (i)';
                                const suffix = cat === 'puntoGPS' ? '-GPS' : '-I';
                                const foto = form.fotos[cat];
                                return (
                                    <div key={cat} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', color: foto ? 'var(--green)' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {label} <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{suffix}</span>
                                            {foto && <CheckCircle2 size={12} style={{ display: 'inline', color: 'var(--green)' }} />}
                                            <FotoAkasoAutomatica
                                                pozoId={form.codigo.trim().toUpperCase() || 'MARC'}
                                                filename={form.codigo.trim() ? `${form.codigo.trim().toUpperCase()}${suffix}.JPG` : `MARC-${Date.now()}${suffix}.JPG`}
                                                categoria={mode === 'SUMIDERO' ? 'Sumidero' : 'General'}
                                                onSuccess={(f) => handleAkasoSuccess(cat, f)}
                                            />
                                        </div>
                                        <div className="photo-zone" style={{ height: '120px', position: 'relative' }}>
                                            <input type="file" accept="image/*" onChange={e => handlePhoto(e, cat)}
                                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                                            <HydratedImage
                                                foto={foto}
                                                alt={label}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                                fallback={<><div className="pz-icon"><ImageIcon size={24} /></div><div className="pz-label">Galería</div></>}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4b. No eliminamos la batea por si la tenían, pero ya no la mostramos como obligatoria ni en el flujo principal */}
                    {isSumidero && mode !== 'SUMIDERO' && form.fotos.batea && (
                        <div className="card" style={{
                            borderColor: 'var(--green)',
                            borderWidth: '1.5px',
                            background: 'rgba(255,140,0,0.05)'
                        }}>
                            <div className="card-title" style={{ color: 'orange', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Foto Batea de Entrada (Existente)
                                <CheckCircle2 size={14} style={{ color: 'var(--green)', display: 'inline' }} />
                            </div>
                            <div className="photo-zone" style={{ height: '120px', position: 'relative' }}>
                                <HydratedImage
                                    foto={form.fotos.batea}
                                    alt="Batea"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* 6. Observaciones */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-2">
                            <div className="card-title" style={{ margin: 0 }}>Observaciones (opcional)</div>
                            <button
                                className="bg-white/5 hover:bg-white/10 text-[10px] py-1 px-2 rounded-md flex items-center gap-1 transition-all text-blue-400"
                                onClick={() => {
                                    const bullet = "• ";
                                    updateForm({ obs: form.obs + (form.obs.endsWith('\n') || form.obs === '' ? '' : '\n') + bullet });
                                }}
                            >
                                <List size={12} /> Añadir Viñeta
                            </button>
                        </div>
                        <textarea
                            rows={4}
                            placeholder="Ej: • Tapa fisurada..."
                            value={form.obs}
                            onChange={e => updateForm({ obs: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const lines = form.obs.split('\n');
                                    const lastLine = lines[lines.length - 1];
                                    if (lastLine.trim().startsWith('•')) {
                                        e.preventDefault();
                                        updateForm({ obs: form.obs + '\n• ' });
                                    }
                                }
                            }}
                            style={{
                                width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border2)',
                                borderRadius: '10px', color: 'var(--text1)', padding: '10px 12px',
                                fontSize: '13px', resize: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box'
                            }}
                        />
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

            {/* Modal de confirmación de eliminación */}
            {deleteItem && (
                <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div className="bg-[#1c2230] border border-[#2d3748] p-6 rounded-2xl w-full max-w-xs shadow-2xl text-center" style={{ background: '#1c2230', border: '1px solid #2d3748', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '320px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center' }}>
                        <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" style={{ color: 'var(--red)', margin: '0 auto 16px' }} />
                        <h3 className="text-lg font-bold text-white mb-2" style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>¿Eliminar Marcación?</h3>
                        <p className="text-gray-400 text-xs mb-6" style={{ color: 'var(--text3)', fontSize: '12px', marginBottom: '24px' }}>
                            Eliminaras <strong>{deleteItem.codigo}</strong>. Escribe <span className="text-white font-bold" style={{ color: 'white', fontWeight: 'bold' }}>ELIMINAR</span> para confirmar:
                        </p>
                        <input
                            type="text"
                            className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-center text-white font-bold uppercase mb-6"
                            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '12px', textAlign: 'center', color: 'white', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', boxSizing: 'border-box' }}
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder="..."
                        />
                        <div className="flex gap-3" style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-ghost flex-1 py-3" style={{ flex: 1, padding: '12px' }} onClick={() => setDeleteItem(null)}>Cancelar</button>
                            <button className="btn btn-danger flex-1 py-3" style={{ flex: 1, padding: '12px', background: 'var(--red)', color: 'white' }} onClick={confirmDelete}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarcacionScreen;
