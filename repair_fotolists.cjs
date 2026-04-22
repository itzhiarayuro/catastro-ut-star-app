/**
 * repair_fotolists.cjs
 *
 * Para cada ficha con fotoList incompleta:
 * 1. Consulta al GAS cuáles archivos existen en Drive para ese pozo
 * 2. Parsea cada filename con la misma lógica de fotoProcessor.ts
 * 3. Agrega a fotoList en Firestore solo las entradas que faltan
 *
 * USO:
 *   node repair_fotolists.cjs              → modo DRY RUN (solo muestra qué haría)
 *   node repair_fotolists.cjs --apply      → aplica cambios reales a Firestore
 *   node repair_fotolists.cjs --municipio SOPO --apply  → solo un municipio
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// ── Configuración ─────────────────────────────────────────────────────────────
const GAS_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwoiNLimJuRNaJUIOxoRU6R47tqDZhfdylx-4DNFHePGOxTiFKPkA7_n3lHvUm06fpe/exec';
const SECRET_TOKEN = 'STAR-2025-VIP-SYNC';
const DRY_RUN = !process.argv.includes('--apply');
const MUNICIPIO_FILTER = (() => {
  const idx = process.argv.indexOf('--municipio');
  return idx !== -1 ? process.argv[idx + 1]?.toUpperCase() : null;
})();
const BATCH_SIZE = 400; // Firestore batch limit
const DELAY_MS = 1000;   // delay entre llamadas GAS para no saturar

// ── Parsear filename → metadata (replica fotoProcessor.ts) ───────────────────
function parsearFilename(filename, idPozo) {
  const clean = filename.toUpperCase().replace(/\s+/g, '');
  let tipo = 'general';
  let categoria = 'OTRO';
  let subcategoria = '';
  let esMedicion = false;
  let esExcluido = false;
  let sumideroAsociado = undefined;

  const matchSum = clean.match(/-SUM(\d+)\.(JPG|JPEG|PNG)$/);
  if (matchSum) sumideroAsociado = `SUM${matchSum[1]}`;

  if (clean.includes('-AT.') || clean.includes('-AT-')) { esMedicion = true; esExcluido = true; }
  else if (clean.includes('-Z.') || clean.includes('-Z-')) { esMedicion = true; esExcluido = true; }

  if (clean.endsWith('-P.JPG') || clean.endsWith('-P.JPEG') || clean.endsWith('-P.PNG')) {
    categoria = 'PRINCIPAL'; subcategoria = 'P'; tipo = 'general';
  } else if (/-T\.(JPG|JPEG|PNG)$/.test(clean) && !/-(E|S|SUM)\d+-T\.(JPG|JPEG|PNG)$/.test(clean)) {
    categoria = 'PRINCIPAL'; subcategoria = 'T'; tipo = 'tapa';
  } else if (clean.endsWith('-I.JPG') || clean.endsWith('-I.JPEG') || clean.endsWith('-I.PNG')) {
    categoria = 'PRINCIPAL'; subcategoria = 'I'; tipo = 'interior';
  } else if (clean.endsWith('-EV.JPG') || clean.endsWith('-EV.JPEG')) {
    categoria = 'PRINCIPAL'; subcategoria = 'EV'; tipo = 'esquema';
  } else if (clean.endsWith('-UG.JPG') || clean.endsWith('-UG.JPEG')) {
    categoria = 'PRINCIPAL'; subcategoria = 'UG'; tipo = 'ubicacion';
  } else if (clean.endsWith('-L.JPG') || clean.endsWith('-L.JPEG') || clean.endsWith('-L.PNG')) {
    categoria = 'PRINCIPAL'; subcategoria = 'L'; tipo = 'shape';
  } else {
    const matchTub = clean.match(/-(E|S)(\d+)-(T|Z|D|B)\.(JPG|JPEG|PNG)$/);
    if (matchTub) {
      const letter = matchTub[1], num = matchTub[2], vista = matchTub[3];
      if (letter === 'E') {
        categoria = 'ENTRADA';
        if (vista === 'T') { subcategoria = `E${num}`; tipo = 'tuberia_tapa'; }
        else if (vista === 'Z') { subcategoria = `E${num}-Z`; tipo = 'medicion'; esMedicion = true; esExcluido = true; }
        else if (vista === 'D') { subcategoria = `E${num}-D`; tipo = 'diametro'; }
        else { subcategoria = `E${num}-P`; tipo = 'general'; }
      } else {
        categoria = 'SALIDA';
        if (vista === 'T') { subcategoria = `S${num}`; tipo = 'tuberia_tapa'; }
        else if (vista === 'Z') { subcategoria = `S${num}-Z`; tipo = 'medicion'; esMedicion = true; esExcluido = true; }
        else if (vista === 'D') { subcategoria = `S${num}-D`; tipo = 'diametro'; }
        else { subcategoria = `S${num}-P`; tipo = 'general'; }
      }
    } else {
      const matchSumFoto = clean.match(/-(SUM)(\d+)-(T|Z|D)\.(JPG|JPEG|PNG)$/);
      if (matchSumFoto) {
        const num = matchSumFoto[2], vista = matchSumFoto[3];
        categoria = 'SUMIDERO';
        if (vista === 'T') { subcategoria = `SUM${num}`; tipo = 'sumidero_tapa'; }
        else if (vista === 'Z') { subcategoria = `SUM${num}-Z`; tipo = 'medicion'; esMedicion = true; esExcluido = true; }
        else { subcategoria = `SUM${num}-D`; tipo = 'diametro'; }
      }
    }
  }

  const entry = { filename, idPozo, pozoId: idPozo, categoria, subcategoria, tipo, esMedicion, esExcluido, binaryStripped: true };
  if (sumideroAsociado !== undefined) entry.sumideroAsociado = sumideroAsociado;
  return entry;
}

// ── Llamar al GAS para listar archivos de un pozo ────────────────────────────
async function listarArchivosEnDrive(municipio, pozoId, categoriaFolder) {
  const body = JSON.stringify({
    token: SECRET_TOKEN,
    action: 'list',
    municipio,
    pozoId,
    categoria: categoriaFolder
  });

  const res = await fetch(GAS_URL, { method: 'POST', body, redirect: 'follow' });
  if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
  let json;
  try {
    const text = await res.text();
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`GAS respuesta no es JSON`);
  }
  if (!json.success) throw new Error(json.error || 'GAS list falló');
  return json.files || [];
}

// ── Determinar carpeta por tipoRegistro ──────────────────────────────────────
function categoriaFolder(tipoRegistro) {
  if (!tipoRegistro) return null; // prueba ambas
  return tipoRegistro.includes('MARCACION') ? 'MARCACION' : 'CATASTRO';
}

// ── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧 repair_fotolists.cjs — ${DRY_RUN ? 'DRY RUN (sin cambios)' : '⚠️  MODO APPLY — escribiendo en Firestore'}`);
  if (MUNICIPIO_FILTER) console.log(`   Filtro municipio: ${MUNICIPIO_FILTER}`);
  console.log('');

  const snapshot = await db.collection('fichas').get();
  const fichas = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    const mun = (d.municipio || '').toUpperCase();
    if (MUNICIPIO_FILTER && mun !== MUNICIPIO_FILTER) return;
    const fotoList = d.fotoList || [];
    const subcats = fotoList.map(f => f.subcategoria || '');
    const tieneT = subcats.some(s => s === 'T');
    const tieneI = subcats.some(s => s === 'I');
    if (!tieneT || !tieneI || fotoList.length === 0) {
      fichas.push({ docId: doc.id, data: d, fotoList });
    }
  });

  console.log(`📋 Fichas a reparar: ${fichas.length}`);
  if (fichas.length === 0) { console.log('✅ Nada que reparar.'); return; }

  let reparadas = 0, sinFotosEnDrive = 0, errores = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < fichas.length; i++) {
    const { docId, data, fotoList } = fichas[i];
    const pozoId = (data.pozo || data.idPozo || '').toUpperCase();
    const municipio = (data.municipio || '').toUpperCase();
    const catFolder = categoriaFolder(data.tipoRegistro);

    if (!pozoId || !municipio) {
      console.warn(`  ⚠️  [${i + 1}/${fichas.length}] ${docId} — sin pozoId o municipio, omitido`);
      continue;
    }

    process.stdout.write(`  [${i + 1}/${fichas.length}] ${municipio} / ${pozoId} ... `);

    let archivos = [];
    try {
      archivos = await listarArchivosEnDrive(municipio, pozoId, catFolder);
      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`❌ Error GAS: ${e.message}`);
      errores++;
      if (errores <= 3) console.log(`     (primeros errores para diagnóstico)`);
      if (errores > 5) { console.log('\n🛑 Demasiados errores seguidos. Verifica el GAS antes de continuar.'); break; }
      continue;
    }

    if (archivos.length === 0) {
      console.log(`📭 sin archivos en Drive`);
      sinFotosEnDrive++;
      continue;
    }

    // Subcategorias ya existentes en fotoList
    const subcatsExistentes = new Set(fotoList.map(f => f.subcategoria || ''));
    const nuevas = [];

    for (const archivo of archivos) {
      const parsed = parsearFilename(archivo.filename, pozoId);
      if (parsed.subcategoria && !subcatsExistentes.has(parsed.subcategoria)) {
        nuevas.push({
          ...parsed,
          id: `${pozoId}_${parsed.subcategoria}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          driveFileId: archivo.fileId,
          binaryStripped: true
        });
        subcatsExistentes.add(parsed.subcategoria);
      }
    }

    if (nuevas.length === 0) {
      console.log(`✅ ya completa (${archivos.length} archivos en Drive, nada nuevo)`);
      continue;
    }

    console.log(`➕ agregando ${nuevas.length} fotos: [${nuevas.map(n => n.subcategoria).join(', ')}]`);
    reparadas++;

    if (!DRY_RUN) {
      const ref = db.collection('fichas').doc(docId);
      batch.update(ref, { fotoList: [...fotoList, ...nuevas] });
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log(`  💾 Batch commiteado`);
      }
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    console.log(`  💾 Batch final commiteado`);
  }

  console.log(`\n===== RESUMEN =====`);
  console.log(`Fichas reparadas:         ${reparadas}`);
  console.log(`Sin archivos en Drive:    ${sinFotosEnDrive}`);
  console.log(`Errores GAS:              ${errores}`);
  if (DRY_RUN) console.log(`\n⚡ Fue DRY RUN. Para aplicar: node repair_fotolists.cjs --apply`);
}

main().catch(console.error);
