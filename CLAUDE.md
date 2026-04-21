# CLAUDE.md - Catastro UT STAR Architect

Este archivo proporciona la guía maestra para Claude Code en este repositorio.

## Project Overview
Sistema de Catastro Técnico para pozos, tuberías y sumideros. Basado en **Vite + React + TypeScript**, con **Firebase** (Firestore + Cloud Functions + Hosting) como backend y un motor de generación de reportes PDF de alta fidelidad ejecutado **server-side** como Cloud Function.

## Key Commands
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
- `check_db.js` - Verifica conectividad Firestore.
- `check_data_stats.cjs` - Estadísticas generales de colecciones.
- `check_fichas_ppz.cjs` - Detecta IDs con prefijo obsoleto PPZ.
- `check_fichas_audit.cjs` - Integridad de fichas y tuberías.
- `check_marcaciones_audit.cjs` - Auditoría de marcaciones.
- `generate_audit_table.cjs` - Genera tabla resumen en Markdown.
- `get_quick_orphans.cjs` - Detecta registros huérfanos.

### Configuración
- `GAS_STRICT_SYNC.js` - Google Apps Script para sincronización.
- `plantilla-diseño.json` - Template del formulario de fichas.
- `service-account.json` - Credenciales Firebase Admin.

## Rules & Coding Standards
- **Muro de Berlín**: NO modifiques la Página 1 del PDF en `generateFicha.ts`. La estructura es fija.
- **Smart Layout**: La Página 2 usa un sistema de 3 columnas dinámico dentro de `generateFicha.ts`. Los bloques vacíos se eliminan totalmente.
- **Tipo de Datos**: 
  - Pozos: `PZ-XXXX`
  - Tuberías: `E1...E8` (Entradas), `S1...S8` (Salidas)
  - Sumideros: `SUM1...SUM6`
- **Garantía Visual**: Las fotos deben mapearse a celdas predefinidas; cualquier desborde rompe el reporte.
- **Lógica de Layout**: Antes de modificar el motor de PDF, lee `public/LOGICA_GENERACION_PAGINA_2.md`.

## Specialized Skills
| File(s) | Skill |
|---------|-------|
| `functions/src/generateFicha.ts` | `/generate-report` |
| `check_*.cjs`, `get_*.cjs` | `/audit-data` |
| `functions/src/driveDuplicateCleaner.ts` | `/sync-drive` |
| `README.md` | `/readme` |
