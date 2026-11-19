---
id: okf/catastro-ut-star-app/01-recuperacion-174
type: incident
title: Recuperación funcional 1.7.4
status: implementing
---

# Recuperación funcional 1.7.4

La versión 1.7.4 parte de la línea funcional 1.7.2 y añade coordenadas DMS sin
degradar el almacenamiento local. Conserva IndexedDB v4, fichas locales,
fotografías pendientes, catálogo de municipios, códigos PZ y captura fotográfica.

La restauración desde Firestore consulta por `createdBy == uid` para inspectores.
Los editores globales aprobados pueden consultar y corregir fichas de todos los
usuarios. La reconciliación conserva cualquier registro local pendiente y solo
reemplaza una copia local cuando ya estaba sincronizada.

Kelly tiene rol de edición global de fichas. Ese rol no concede eliminación,
limpieza de Drive ni otras operaciones de mantenimiento.

La publicación queda limitada a Firebase Hosting y, si cambia la autorización
del visor global, a las funciones BigQuery de solo consulta correspondientes.
