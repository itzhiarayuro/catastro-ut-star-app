---
id: okf/catastro-ut-star-app/01-recuperacion-174
type: incident
title: Recuperación funcional 1.7.4
status: deployed
---

# Recuperación funcional 1.7.4

Las funciones específicas del visor usan Node.js 22 porque Firebase retiró el runtime 20 el 2026-10-30. El cambio de runtime no amplía el alcance del despliegue.

`index.html`, `sw.js` y `manifest.webmanifest` tienen reglas exclusivas sin caché; la regla general de activos no incluye HTML para evitar que Firebase aplique una cabecera contradictoria.

La versión 1.7.4 parte de la línea funcional 1.7.2 y añade coordenadas DMS sin
degradar el almacenamiento local. Conserva IndexedDB v4, fichas locales,
fotografías pendientes, catálogo de municipios, códigos PZ y captura fotográfica.

La restauración desde Firestore consulta por `createdBy == uid` para inspectores.
Los editores globales aprobados pueden consultar y corregir fichas de todos los
usuarios. La reconciliación conserva cualquier registro local pendiente y solo
reemplaza una copia local cuando ya estaba sincronizada.

Kelly tiene rol de edición global de fichas. Ese rol no concede eliminación,
limpieza de Drive ni otras operaciones de mantenimiento.

## Evidencia de publicación

- Hosting activo: versión Firebase `8fe801763baca6bf`, release `1795104901815000`.
- Artefacto servido: `/assets/index-Dqt1IruS.js`, con versión 1.7.4, coordenadas manuales y política de Kelly.
- Funciones `bqGetPozos`, `bqGetMarcaciones`, `bqGetTuberias` y `bqGetSumideros`: estado ACTIVE, runtime Node.js 22.
- Conteo posterior: 1.030 fichas totales y 1.024 activas, igual al respaldo previo.
- `index.html`, raíz, service worker y manifiesto se sirven sin caché.
- La validación autenticada final debe realizarla Kelly después de usar el correo oficial de establecimiento de contraseña; no se generaron ni conservaron credenciales.

## Corrección de sincronización fotográfica

La sincronización manual y nocturna usa la función autenticada `uploadPendingPhoto`, con secretos de Drive únicamente en Firebase Functions. El navegador ya no necesita `VITE_GAS_DRIVE_SYNC_URL` ni `VITE_GAS_SECRET_TOKEN` para subir fotos. Una foto se retira de IndexedDB solo después de que Firebase devuelve su `driveId`; los errores conservan el pendiente para reintento.

La publicación queda limitada a Firebase Hosting y, si cambia la autorización
del visor global, a las funciones BigQuery de solo consulta correspondientes.
