# Respaldo de metadatos previo al release 1.7.4

Fecha de captura: 2026-11-19 (America/Bogota).

- Proyecto Firebase: `catastro-ut-star`.
- Dominio operativo: `https://catastro-ut-star.firebaseapp.com/`.
- Artefacto activo previo: `/assets/index-DINF-dSX.js` (versión visible 1.7.3).
- SHA-256 del `index.html` activo: `8c829f716e5bc9777a5b73690dba0f15c35e15b84d0d69a2fa3ea2c5c326cf54`.
- Documentos en `fichas`: 1.030 totales, 1.024 activos.
- La captura fue de solo lectura. No se restauró, eliminó ni reescribió ningún documento.

## Alcance del despliegue

Solo Hosting y, si son necesarias, `bqGetPozos`, `bqGetMarcaciones`, `bqGetTuberias` y `bqGetSumideros`. No desplegar reglas, Firestore, funciones de limpieza ni migraciones.

## Verificación posterior

Después del despliegue se debe volver a medir el conteo, comprobar la versión 1.7.4 y conservar el release anterior de Hosting como opción de rollback sin alterar IndexedDB.
