# Contrato de tarea: recuperación segura 1.7.4

## Objetivo

Restaurar la línea funcional 1.7.2, conservar todas las fichas y fotografías
existentes, incorporar el ingreso manual de coordenadas DMS y habilitar a
`kellyvj.icya@gmail.com` para consultar y editar todas las fichas sin permisos
de eliminación ni mantenimiento administrativo.

## Criterios de aceptación

- La aplicación y el paquete muestran la versión `1.7.4`.
- El catálogo, códigos `PZ` alfanuméricos y fotos de pasos 4 y 5 de 1.7.2 se conservan.
- `4°43'39.6"N, 74°26'52.5"W` actualiza el GPS a
  `4.7276667, -74.4479167`; una entrada inválida no modifica el GPS previo.
- IndexedDB permanece en versión 4 y conserva `fotos_pendientes` y
  `fichas_locales` durante una actualización.
- La restauración por UID combina nube y local sin borrar borradores ni cambios
  locales pendientes y es idempotente.
- Kelly puede ver y editar todas las fichas, pero no eliminarlas ni ejecutar
  limpieza de Drive. Los inspectores conservan acceso solo a sus fichas en UI.
- El build falla si la configuración Firebase queda vacía.
- Pasan tests, TypeScript, lint, build y comprobación visual del artefacto.
- Se despliegan únicamente Hosting y las funciones de consulta global necesarias.
- La subida de fotos no depende de configuración GAS en el navegador; usa una función Firebase autenticada y conserva cada pendiente hasta recibir su `driveId`.
- La función normaliza el identificador raíz de Drive para tolerar espacios o saltos de línea accidentales en el secreto.
- La escritura autenticada delega al Apps Script autorizado sobre la unidad compartida; su URL y token permanecen como secretos de Functions y nunca se envían al navegador.
- Al seleccionar `OTRO` en el estado de un ramal del paso 4 aparece un campo de texto; el valor personalizado se guarda en `pipe.estado` y vuelve a mostrarse al editar.

## Interfaces de prueba acordadas

1. Conversión pública de coordenadas DMS.
2. Función pura de reconciliación de fichas locales y remotas.
3. Política pública de roles para lectura global, edición y eliminación.
4. Almacenamiento IndexedDB real en navegador, actualizado desde esquema v4.
5. Formulario público de estado de ramales en el paso 4.

## Límites

No se borran, renombran ni migran masivamente documentos de Firestore, archivos
de Drive o datos del navegador. No se despliegan reglas de Firestore ni funciones
de mantenimiento.
