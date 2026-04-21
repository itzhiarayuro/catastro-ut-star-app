---
name: sync-drive
description: Diagnostica y resuelve problemas de sincronización entre Google Drive y la base de datos de catastro (fotos faltantes, duplicados, discrepancias de IDs).
disable-model-invocation: true
---
# Skill: Sincronización de Activos Digitales (Drive)

Este skill ayuda a mantener la paridad entre las fotos almacenadas en Google Drive y los registros en Firestore.

## Arquitectura de Fotos
1. **Google Apps Script** (`GAS_STRICT_SYNC.js`): Sirve las fotos desde Drive como respuesta a peticiones del frontend.
2. **Frontend** (`src/utils/driveSync.ts`): Descarga fotos de Drive y las cachea en IndexedDB.
3. **Backend** (`functions/src/driveDuplicateCleaner.ts`): Cloud Function para limpiar duplicados en Drive.

## Tareas Comunes
1. **Detectar Huérfanos**: Ejecuta `node get_quick_orphans.cjs` (raíz del proyecto) para encontrar archivos en Drive sin registro en DB.
2. **Auditoría de Marcaciones**: Ejecuta `node check_marcaciones_audit.cjs` (raíz del proyecto).
3. **Limpiar Duplicados**: Usa la Cloud Function `driveDuplicateCleaner` o el script legacy `deprecated/drive_duplicate_cleaner_simple.py` (con precaución).

## Resolución de Problemas (Troubleshooting)
- Si un pozo no muestra fotos:
  1. Verifica el ID del pozo (formato `PZ-XXXX`, mayúsculas).
  2. Revisa si las fotos en Drive siguen el patrón `-E1`, `-S1`, `-SUM1`, etc.
  3. Verifica la hidratación de fotos en `src/hooks/usePdfExport.ts` (función `handlePDF`).
  4. Revisa `src/utils/storageManager.ts` y `src/utils/driveSync.ts` para lógica de caché.
