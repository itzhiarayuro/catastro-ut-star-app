---
name: learn
description: Extrae y documenta patrones aprendidos durante la sesión de codificación para persistir el conocimiento en CLAUDE.md o LOGICA_GENERACION_PAGINA_2.md.
disable-model-invocation: true
---
# Skill: Continuous Learning (Aprendizaje Continuo)

Este skill permite que Claude evolucione con el proyecto, evitando repetir errores pasados.

## Cuándo usar
- Después de resolver un bug complejo en el motor de PDF.
- Después de descubrir una nueva restricción en la API de Firebase.
- Al finalizar una tarea importante.

## Instrucciones
1. **Analiza**: Revisa el historial de la conversación actual.
2. **Identifica**:
   - ¿Qué se arregló?
   - ¿Qué patrón de código se debe seguir de ahora en adelante?
   - ¿Qué archivos se vieron afectados?
3. **Persiste**:
   - Actualiza `CLAUDE.md` en la sección de "Rules & Coding Standards" si es una regla general.
   - Crea/Actualiza un archivo en `.claude/memory/` si es un conocimiento específico de una funcionalidad.
4. **Resumen**: Presenta al usuario un resumen de "Conocimiento Extraído".
