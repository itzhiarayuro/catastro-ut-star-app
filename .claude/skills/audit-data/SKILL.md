---
name: audit-data
description: Ejecuta auditorías completas sobre la base de datos de pozos, tuberías y sumideros. Úsalo cuando necesites validar la integridad de los datos después de una carga masiva o antes de generar reportes.
disable-model-invocation: true
model: haiku
effort: low
---
# Skill: Auditoría de Datos Técnica

Este skill orquesta la ejecución de múltiples scripts de validación en el proyecto Catastro UT STAR.

## Flujo de Ejecución
Cuando el usuario invoque `/audit-data`, debes realizar los siguientes pasos en orden:

1. **Conexión**: Ejecuta `node check_db.js` para asegurar que Firestore es accesible.
2. **Estadísticas Generales**: Ejecuta `node check_data_stats.cjs`.
3. **Validación de Prefijos**: Ejecuta `node check_fichas_ppz.cjs` para detectar IDs obsoletos con prefijo PPZ.
4. **Integridad de Tuberías**: Ejecuta `node check_fichas_audit.cjs`.
5. **Auditoría de Marcaciones**: Ejecuta `node check_marcaciones_audit.cjs`.
6. **Huérfanos**: Ejecuta `node get_quick_orphans.cjs` para detectar registros sin relación.
7. **Generar Tabla de Resumen**: Ejecuta `node generate_audit_table.cjs`.

> **NOTA**: Todos los scripts están en la **raíz del proyecto**, NO en `scripts/`.

## Salida Esperada
Presenta un resumen ejecutivo indicando:
- Número de inconsistencias detectadas.
- Tipos de errores (prefijos PPZ, campos vacíos, tuberías huérfanas).
- Ruta al archivo `audit_full_table.md` generado.

> [!WARNING]
> No intentes corregir los datos automáticamente a menos que el usuario lo solicite explícitamente después de ver los resultados.
