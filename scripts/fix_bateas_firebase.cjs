const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../service-account.json');

// NOTA: Para correr esto debes asegurarte de que service-account.json contenga credenciales válidas.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runBateasFix() {
  console.log('--- INICIANDO CORRECCIÓN DE BATEAS EN PRODUCCIÓN ---');
  
  const marcacionesRef = db.collection('marcaciones');
  const snapshot = await marcacionesRef.get();
  
  let docsAfectados = 0;
  let tuberiasCorregidas = 0;

  const batchSize = 100;
  let batch = db.batch();
  let operationCount = 0;
  let totalBatches = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    let hasChanges = false;
    let newPipes = [];
    
    if (data.pipes && Array.isArray(data.pipes)) {
      data.pipes.forEach(p => {
        let pToSave = { ...p };
        const cotaZ = parseFloat(p.cotaZ);
        
        let bateaGuardada = null;
        if (typeof p.batea !== 'undefined') {
            bateaGuardada = parseFloat(p.batea);
        } else if (typeof p.bateaCalculada !== 'undefined') {
            bateaGuardada = parseFloat(p.bateaCalculada);
        }
        
        // El offset sospechoso reportado es +0.15 exacto sobre cotaZ
        if (!isNaN(cotaZ) && bateaGuardada !== null && !isNaN(bateaGuardada)) {
          const diff = bateaGuardada - cotaZ;
          
          if (Math.abs(diff - 0.15) < 0.001) {
            
            // Determinar diámetro
            const diamOriginal = parseFloat(p.diam) || 0;
            if (diamOriginal > 0) {
              let unitToSet = p.unit;
              
              // Heurística de unidad
              if (!unitToSet) {
                unitToSet = diamOriginal < 100 ? 'in' : 'mm';
              }
              
              let diamMetros = 0;
              if (unitToSet === 'in') {
                diamMetros = diamOriginal * 0.0254;
              } else if (unitToSet === 'mm') {
                diamMetros = diamOriginal / 1000;
              } else if (unitToSet === 'm') {
                diamMetros = diamOriginal;
              }
              
              const bateaCorrecta = cotaZ + diamMetros;
              
              // Aplicar corrección solo si el error > 5mm (ignorar tubos de ~6" en in que ya daban ~0.15)
              if (Math.abs(bateaGuardada - bateaCorrecta) > 0.005) {
                pToSave.batea = bateaCorrecta.toFixed(4);
                pToSave.unit = unitToSet; // Guardamos la unidad explícita para evitar futuros bugs de ambigüedad
                if (typeof pToSave.bateaCalculada !== 'undefined') {
                    pToSave.bateaCalculada = pToSave.batea;
                }

                console.log(`[FIXED] Doc ${doc.id} | Tubo ${p.id || p.deA || '?'} | Ø: ${diamOriginal}${unitToSet} -> Batea Antigua: ${bateaGuardada} | Batea Nueva: ${pToSave.batea}`);
                hasChanges = true;
                tuberiasCorregidas++;
              }
            }
          }
        }
        
        // Aseguramos que si le faltaba la unidad y no era un caso anómalo, la dejamos en el array explícita de todas formas
        if (!pToSave.unit) {
            const diamOriginal = parseFloat(pToSave.diam) || 0;
            if (diamOriginal > 0) {
                pToSave.unit = diamOriginal < 100 ? 'in' : 'mm';
                hasChanges = true;
            }
        }

        newPipes.push(pToSave);
      });
    }

    if (hasChanges) {
      docsAfectados++;
      batch.update(doc.ref, { pipes: newPipes });
      operationCount++;

      // Commit de Firebase Batch (límite 500)
      if (operationCount >= batchSize) {
        batch.commit();
        totalBatches++;
        console.log(`[BATCH COMMIT] Enviado lote ${totalBatches} (${operationCount} docs)`);
        batch = db.batch();
        operationCount = 0;
      }
    }
  });

  if (operationCount > 0) {
    await batch.commit();
    totalBatches++;
    console.log(`[BATCH COMMIT FINAL] Enviado lote final ${totalBatches} (${operationCount} docs)`);
  }

  console.log('\n--- RESUMEN CORRECCIÓN ---');
  console.log(`- Marcaciones totales escaneadas: ${snapshot.size}`);
  console.log(`- Tuberías afectadas corregidas: ${tuberiasCorregidas}`);
  console.log(`- Documentos de marcación modificados: ${docsAfectados}`);
  console.log('✅ Base de datos actualizada con éxito.');
}

runBateasFix().catch(console.error);
