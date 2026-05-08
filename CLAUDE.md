# CLAUDE.md - Catastro UT STAR Architect

Este archivo proporciona la guía maestra para Claude Code en este repositorio.

## Project Overview
Sistema de Catastro Técnico para pozos, tuberías y sumideros. Basado en **Vite + React + TypeScript**, con **Firebase** (Firestore + Cloud Functions + Hosting) como backend y un motor de generación de reportes PDF de alta fidelidad ejecutado **server-side** como Cloud Function.

> **Aviso — dos motores de PDF distintos en el workspace:**
> - Este proyecto (`catastro-ut-star-app`): motor en `functions/src/generateFicha.ts` (Cloud Function, Vite/React).
> - Proyecto `sistema-fichas-tecnicas` (Next.js, desplegado en `sistema-fichas-tecnicas.web.app`): motor distinto en `firebaseAdapter.ts`.
> No mezclar referencias entre ambos. Cuando se hable de "motor PDF" sin calificar, asumir el de **este** proyecto.

## Key Commands
> Nota: los siguientes slash-commands están **planificados** pero no necesariamente implementados como skills activos en este entorno. Antes de invocarlos, verificar su existencia en la lista de skills disponibles.
- `/audit-data` - Ejecuta scripts de integridad en Firestore.
- `/generate-report` - Depura y optimiza la lógica del PDF.
- `/sync-drive` - Resuelve problemas de fotos faltantes.
- `/learn` - Extrae nuevos patrones aprendidos en esta sesión.
- `/readme` - Actualiza la documentación técnica principal.

## Architecture

### Frontend (Vite + React)
- `src/App.tsx` - Punto de entrada principal de la aplicación (20KB).
- `src/components/` - Componentes reutilizables (FichasViewer, SmartGeoTracker).
- `src/hooks/usePdfExport.ts` - Hook que invoca la Cloud Function `generateFicha`.
- `src/hooks/useFichaActions.ts` - CRUD de fichas técnicas.
- `src/presentation/` - Páginas y componentes de presentación.
- `src/application/services/` - Lógica de negocio (FichaService).
- `src/utils/export.ts` - Exportación local a PDF/Excel (jsPDF + XLSX).
- `src/lib/firebase.tsx` - Configuración de Firebase SDK.
- `src/lib/mapUtils.ts` - Utilidades de geolocalización.

### Backend (Cloud Functions)
- `functions/src/generateFicha.ts` - **EL ARCHIVO MÁS CRÍTICO** (54KB). Contiene TODA la lógica de generación del PDF de alta fidelidad, incluyendo el Smart Layout Engine de 3 columnas.
- `functions/src/index.ts` - Entry point de Cloud Functions (exports).
- `functions/src/firestoreProxy.ts` - Proxy para operaciones Firestore.
- `functions/src/driveDuplicateCleaner.ts` - Limpiador de duplicados en Drive.
- `functions/src/maintenance.ts` - Tareas de mantenimiento.

### Scripts de Auditoría (raíz del proyecto)
Patrón general: `check_*.cjs` / `check_*.js` (integridad, stats, conectividad) y `get_*.cjs` (huérfanos, consultas rápidas). Hay ~20 scripts; listar todos aquí sería frágil.
Puntos de entrada típicos:
- `check_db.js` / `check_data_stats.cjs` - conectividad y stats globales.
- `check_fichas_audit.cjs` / `check_fichas_deep.cjs` - integridad de fichas y tuberías.
- `check_marcaciones_audit.cjs` - auditoría de marcaciones.
- `get_quick_orphans.cjs` (y `_v2`) - registros huérfanos.
- `generate_audit_table.cjs` - tabla resumen en Markdown.
Antes de crear un script nuevo, revisa si ya existe uno equivalente por nombre (`ls check_* get_*`).

### Migraciones y utilidades
- `firestore_migration_full.py`, `generate_final_migration.py`, `migrate_*.cjs/js` - migraciones puntuales; **no re-ejecutar sin confirmación explícita**.
- `scripts/`, `docs/` - utilidades y documentación interna.
- `deprecated/`, `tmp/`, `dist/` - ignorar salvo instrucción expresa.

### Configuración
- `GAS_STRICT_SYNC.js` - Google Apps Script para sincronización.
- `plantilla-diseño.json` / `plantilla-clean.json` - template del formulario de fichas.
- `firebase.json`, `firestore.rules` - configuración de Firebase.

### Secretos — NO TOCAR
- `service-account.json` - **credenciales Firebase Admin**. No leer en respuestas, no loguear, no subir a herramientas externas (pastebins, revisores online, etc.), no incluir en commits. Si hay que referenciarlo, usar la variable de entorno o el path, nunca el contenido.

## Rules & Coding Standards
- **Muro de Berlín**: NO modifiques la Página 1 del PDF en `generateFicha.ts`. La estructura es fija.
- **Smart Layout**: La Página 2 usa un sistema de 3 columnas dinámico dentro de `generateFicha.ts`. Los bloques vacíos se eliminan totalmente.
- **Tipo de Datos**: 
  - Pozos: `PZ-XXXX`
  - Tuberías: `E1...E8` (Entradas), `S1...S8` (Salidas)
  - Sumideros: `SUM1...SUM6`
- **Garantía Visual**: Las fotos deben mapearse a celdas predefinidas; cualquier desborde rompe el reporte.
- **Lógica de Layout**: Antes de modificar el motor de PDF, lee `public/LOGICA_GENERACION_PAGINA_2.md`.

## Photo Mapping Logic
Para asegurar que las fotos correctas aparezcan en los reportes:
- **Foto de Tapa (Página 1)**: Debe ser un match estricto con el código `T` (ej: `PZ001-T.JPG`). Ignorar fotos que contengan prefijos de entradas/salidas (como `E1-T` o `S2-T`).
- **Fotos Técnicas (Página 2)**: Para los slots de Entradas (`E1-E8`) y Salidas (`S1-S8`), si existen múltiples fotos para el mismo código, se debe seguir este orden de prioridad:
  1. `TUBERIA_TAPA` (Sufijo `-T`) -> Prioridad máxima para el cuadro técnico.
  2. `SUMIDERO/DETALLE` (Sufijo `-D`)
  3. `PROFUNDIDAD` (Sufijo `-Z`) -> Solo si no hay otras disponibles.
- **Normalización**: Siempre buscar el ID del pozo sin el prefijo del municipio (ej: buscar `C001` en vez de `QUIPILE_C001`) al mapear archivos de fotos.

## Specialized Skills
> Tabla de mapeo **aspiracional** — pendiente de implementación como skills reales. Mantener como referencia de intención, pero no asumir que los slash-commands existen.

| File(s) | Skill |
|---------|-------|
| `functions/src/generateFicha.ts` | `/generate-report` |
| `check_*.cjs`, `get_*.cjs` | `/audit-data` |
| `functions/src/driveDuplicateCleaner.ts` | `/sync-drive` |
| `README.md` | `/readme` |

Skill actualmente **activo** en este workspace: `architecture-advisor` (contexto profundo sobre modelo de datos y arquitectura; invocar ante cambios estructurales).
