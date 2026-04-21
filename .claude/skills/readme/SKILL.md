---
name: readme
description: Gestiona y sincroniza la documentación técnica del proyecto. Asegura que el README.md y otros manuales reflejen el estado actual del código.
disable-model-invocation: true
---
# Skill: Documentador Técnico

Este skill mantiene la documentación técnica viva y precisa.

## Tareas
1. **Actualizar Arquitectura**: Si se crean nuevas carpetas o servicios, actualiza la sección de "Arquitectura" en `README.md`.
2. **Guía de Scripts**: Asegura que todos los scripts útiles en `scripts/` estén listados con su propósito.
3. **Sincronización**: Mantén paridad entre `CLAUDE.md` (reglas para la IA) y `README.md` (guía para humanos).

## Instrucciones para Claude
- Usa un tono profesional y técnico.
- Mantén las tablas de comandos ordenadas.
- Documenta las variables de entorno necesarias (`.env.example`).
