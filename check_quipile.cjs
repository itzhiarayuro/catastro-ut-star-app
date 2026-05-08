/**
 * check_quipile.cjs
 * Audita los pozos PZC001 y PZC002 del municipio QUIPILE en Firestore.
 * Verifica campos principales y lista de fotos (fotoList).
 *
 * Uso: node check_quipile.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const TARGET_POZOS = ['PZC001', 'PZC002'];
const TARGET_MUNICIPIO = 'QUIPILE';

function printField(label, value) {
    const display = value === undefined ? '⚠️  (ausente)' : (value === '' ? '⚠️  (vacío)' : value);
    console.log(`   ${label.padEnd(20)} : ${display}`);
}

async function auditarPozo(doc) {
    const d = doc.data();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📋 DOC ID: ${doc.id}  |  pozo: ${d.pozo || '?'}  |  municipio: ${d.municipio || '?'}`);
    console.log('═'.repeat(60));

    // ── Campos de identificación ──────────────────────────────────
    console.log('\n  [Identificación]');
    printField('pozo',         d.pozo);
    printField('municipio',    d.municipio);
    printField('fecha',        d.fecha);
    printField('creatorEmail', d.creatorEmail);
    printField('estado',       d.estadoPozo || d.estado);

    // ── Coordenadas ───────────────────────────────────────────────
    console.log('\n  [Coordenadas]');
    printField('coordenada_x', d.coordenada_x);
    printField('coordenada_y', d.coordenada_y);
    printField('gps.lat',      d.gps?.lat);
    printField('gps.lng',      d.gps?.lng);
    printField('enlace',       d.enlace);

    // ── Ubicación ─────────────────────────────────────────────────
    console.log('\n  [Ubicación]');
    printField('direccion',    d.direccion);
    printField('barrio',       d.barrio);
    printField('rasante',      d.rasante);
    printField('camara',       d.camara);
    printField('sistema',      d.sistema);
    printField('altura',       d.altura);
    printField('diam',         d.diam);

    // ── Componentes ───────────────────────────────────────────────
    console.log('\n  [Componentes]');
    const comp = ['tapa', 'cono', 'cuerpo', 'canu', 'peld'];
    comp.forEach(c => {
        const obj = d[c] || {};
        console.log(`   ${c.padEnd(6)} → existe: ${obj.existe ?? '⚠️ '} | mat: ${obj.mat ?? '—'} | estado: ${obj.estado ?? '—'}${obj.num !== undefined ? ` | num: ${obj.num}` : ''}`);
    });

    // ── Tuberías ──────────────────────────────────────────────────
    const pipes = d.pipes || d.tuberias || [];
    console.log(`\n  [Tuberías] (${pipes.length} registradas)`);
    if (pipes.length === 0) {
        console.log('   ⚠️  Sin tuberías en el documento.');
    } else {
        pipes.forEach((p, i) => {
            console.log(`   [${i}] id: ${p.id || p.deA || '?'} | tipo: ${p.es || p.tipo || '?'} | diam: ${p.diam || p.diametro || '?'} | mat: ${p.mat || p.material || '?'} | cotaZ: ${p.cotaZ || p.z || '?'}`);
        });
    }

    // ── Fotos ─────────────────────────────────────────────────────
    const fotos = d.fotoList || [];
    console.log(`\n  [fotoList] (${fotos.length} fotos)`);
    if (fotos.length === 0) {
        console.log('   ⚠️  Sin fotos registradas.');
    } else {
        fotos.forEach((f, i) => {
            const nombre = f.filename || f.nombre || '?';
            const cat    = f.categoria || f.type || '?';
            const sub    = f.subcategoria || f.categoryLabel || '—';
            const src    = f.driveId ? `drive:${f.driveId}` : (f.url ? 'url' : '(sin fuente)');
            console.log(`   [${String(i).padStart(2)}] ${nombre.padEnd(30)} | cat: ${String(cat).padEnd(12)} | sub: ${String(sub).padEnd(6)} | ${src}`);
        });
    }

    // ── Validación rápida ─────────────────────────────────────────
    console.log('\n  [Validación rápida]');
    const tieneT   = fotos.some(f => (f.subcategoria || '').toUpperCase() === 'T' || (f.filename || '').toUpperCase().match(/[-_]T\./));
    const tieneI   = fotos.some(f => (f.subcategoria || '').toUpperCase() === 'I' || (f.filename || '').toUpperCase().match(/[-_]I\./));
    const tieneE1  = fotos.some(f => (f.filename || '').toUpperCase().includes('-E1'));
    const tieneS1  = fotos.some(f => (f.filename || '').toUpperCase().includes('-S1'));
    const tieneCoorX = !!(d.coordenada_x || d.gps?.x);
    const tieneCoorY = !!(d.coordenada_y || d.gps?.y);

    console.log(`   Tapa (T)    : ${tieneT ? '✅' : '❌ FALTA'}`);
    console.log(`   Interior(I) : ${tieneI ? '✅' : '❌ FALTA'}`);
    console.log(`   Entrada E1  : ${tieneE1 ? '✅' : '⚠️  no detectada'}`);
    console.log(`   Salida S1   : ${tieneS1 ? '✅' : '⚠️  no detectada'}`);
    console.log(`   Coordenada X: ${tieneCoorX ? '✅' : '❌ FALTA'}`);
    console.log(`   Coordenada Y: ${tieneCoorY ? '✅' : '❌ FALTA'}`);
}

async function main() {
    console.log(`\n🔍 Buscando pozos ${TARGET_POZOS.join(', ')} en municipio ${TARGET_MUNICIPIO}...\n`);

    // Búsqueda por municipio + código de pozo
    const results = new Map();

    for (const codigoPozo of TARGET_POZOS) {
        const snap = await db.collection('fichas')
            .where('pozo', '==', codigoPozo)
            .where('municipio', '==', TARGET_MUNICIPIO)
            .get();

        if (!snap.empty) {
            snap.docs.forEach(doc => results.set(doc.id, doc));
        } else {
            // Búsqueda ampliada: solo por código de pozo
            const snap2 = await db.collection('fichas')
                .where('pozo', '==', codigoPozo)
                .get();
            if (!snap2.empty) {
                snap2.docs.forEach(doc => results.set(doc.id, doc));
            } else {
                console.log(`⚠️  No se encontró ningún documento con pozo="${codigoPozo}"`);
            }
        }
    }

    if (results.size === 0) {
        // Búsqueda de emergencia: scan parcial por prefijo
        console.log('\n⚠️  Búsqueda directa vacía. Haciendo scan por prefijo PZC en municipio QUIPILE...');
        const allSnap = await db.collection('fichas')
            .where('municipio', '==', TARGET_MUNICIPIO)
            .get();
        allSnap.docs
            .filter(d => TARGET_POZOS.includes((d.data().pozo || '').toUpperCase()))
            .forEach(doc => results.set(doc.id, doc));
    }

    if (results.size === 0) {
        console.log('❌ No se encontraron documentos. Verifica el nombre del municipio y el campo "pozo" en Firestore.');
        process.exit(0);
    }

    for (const doc of results.values()) {
        await auditarPozo(doc);
    }

    console.log(`\n✅ Auditoría completada. ${results.size} pozo(s) analizados.\n`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
