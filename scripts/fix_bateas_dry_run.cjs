const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function runDryRun() {
  console.log('--- INICIANDO DRY-RUN DE CÁLCULO DE BATEAS ---');
  
  const marcacionesRef = db.collection('marcaciones');
  const snapshot = await marcacionesRef.get();
  
  let docsAfectados = 0;
  let tuberiasCorregidas = 0;
  let erroresOffset15 = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    let hasChanges = false;
    
    if (data.pipes && Array.isArray(data.pipes)) {
      data.pipes.forEach(p => {
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
            erroresOffset15++;
            
            // Determinar diámetro
            const diamOriginal = parseFloat(p.diam) || 0;
            if (diamOriginal > 0) {
              let unitToSet = p.unit;
              
              // Si no tiene unidad explícita, aplicamos heurística:
              // Menor a 60 -> pulgadas, Mayor o igual a 100 -> milímetros
              if (!unitToSet) {
                unitToSet = diamOriginal < 100 ? 'in' : 'mm';
              }
              
              // Recalcular
              let diamMetros = 0;
              if (unitToSet === 'in') {
                diamMetros = diamOriginal * 0.0254;
              } else if (unitToSet === 'mm') {
                diamMetros = diamOriginal / 1000;
              } else if (unitToSet === 'm') {
                diamMetros = diamOriginal;
              }
              
              const bateaCorrecta = cotaZ + diamMetros;
              
              // Sólo es un error si la batea calculada nueva es distinta del 0.15 quemado
              // (Por ejemplo, un tubo de 6" in da 0.1524m, que es casi 0.15m, pero para 16" in es 0.406m)
              if (Math.abs(bateaGuardada - bateaCorrecta) > 0.005) {
                console.log(`[!] Doc: ${doc.id} | Tubo: ${p.id || p.deA || '?'} | Tipo: ${p.es || '?'}`);
                console.log(`    Ø: ${diamOriginal} ${unitToSet} (${diamMetros.toFixed(4)}m) | Clave(Z): ${cotaZ}`);
                console.log(`    ❌ Batea Actual : ${bateaGuardada}`);
                console.log(`    ✅ Batea Correcta: ${bateaCorrecta.toFixed(4)}`);
                console.log(`    Δ Error: ${((bateaGuardada - bateaCorrecta) * 1000).toFixed(1)} mm`);
                
                hasChanges = true;
                tuberiasCorregidas++;
              }
            }
          }
        }
      });
    }

    if (hasChanges) {
      docsAfectados++;
    }
  });

  console.log('\n--- RESUMEN DRY-RUN ---');
  console.log(`- Marcaciones totales escaneadas: ${snapshot.size}`);
  console.log(`- Tuberías con offset de +0.15 encontrado: ${erroresOffset15}`);
  console.log(`- Tuberías que NECESITAN corrección (> 5mm error): ${tuberiasCorregidas}`);
  console.log(`- Marcaciones (Documentos) afectadas: ${docsAfectados}`);
  console.log('NOTA: No se han realizado cambios en la base de datos.');
}

runDryRun().catch(console.error);
