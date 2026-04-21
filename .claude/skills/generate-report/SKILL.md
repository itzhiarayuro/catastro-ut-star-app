---
name: generate-report
description: Gestiona la lógica de generación de fichas técnicas en PDF. Úsalo para depurar problemas de layout, campos faltantes o fotos que no aparecen en el reporte.
disable-model-invocation: true
model: opusplan
effort: max
---
# Skill: Generador de Reportes Alta Fidelidad

Este skill proporciona el contexto necesario para trabajar con el motor de PDF.

## Arquitectura del PDF
La generación del PDF NO ocurre en el frontend. El flujo es:
1. **Frontend** (`src/hooks/usePdfExport.ts`): Hidrata fotos desde IndexedDB/Drive y llama a la Cloud Function `generateFicha`.
2. **Backend** (`functions/src/generateFicha.ts`): **ARCHIVO CENTRAL (54KB)**. Contiene TODA la lógica de renderizado, incluyendo el Smart Layout Engine de 3 columnas para la Página 2.
3. **Exportación Local** (`src/utils/export.ts`): Exportación simplificada alternativa usando jsPDF (solo para tablas rápidas, NO es el generador principal).

## Instrucciones de Uso
Cuando el usuario pida ayuda con un PDF o invoque `/generate-report`:

1. **Contexto de Layout**: Lee siempre `public/LOGICA_GENERACION_PAGINA_2.md` antes de sugerir cambios en el posicionamiento de elementos.
2. **Archivo Clave**: `functions/src/generateFicha.ts` — Aquí vive TODO: el orquestador, el layout de 3 columnas y el renderizado de fotos.
3. **Validación Visual**:
   - Asegúrate de que las coordenadas (x, y) no sobrepasen el Header Boundary (detectado dinámicamente).
   - Verifica que las fotos tengan el mapeo correcto según los códigos `E1-E8`, `S1-S8`, `SUM1-SUM6`.

## Reglas de Oro
- **Muro de Berlín**: NO modifiques la Página 1 a menos que sea una corrección de typo. La página 1 tiene un layout estricto de una sola columna.
- **Eficiencia**: Sugiere siempre omitir la página 2 si no hay datos técnicos.
- **Backup**: Antes de modificar `generateFicha.ts`, referencia siempre `generateFicha_OLD.ts` como respaldo histórico.
