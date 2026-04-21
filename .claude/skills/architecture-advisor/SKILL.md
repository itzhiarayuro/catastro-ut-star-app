---
name: architecture-advisor
description: Proporciona contexto profundo sobre el modelo de datos y arquitectura de la solución de catastro. Se activa cuando se discuten cambios estructurales.
user-invocable: false
model: opus
effort: high
---
# Background Skill: Arquitecto Senior Catastro

Esta habilidad actúa como un consultor interno para asegurar que el modelo de datos se mantenga coherente.

## Mapa de Arquitectura
```
catastro-ut-star-app/
├── src/                          # Frontend (Vite + React)
│   ├── App.tsx                   # Entrada principal (20KB)
│   ├── components/               # Componentes UI
│   ├── hooks/                    # usePdfExport, useFichaActions
│   ├── presentation/             # Páginas (FichasPage, FichasViewerPage)
│   ├── application/services/     # Lógica de negocio (FichaService)
│   ├── utils/                    # export.ts, driveSync, storageManager
│   └── lib/                      # firebase.tsx, mapUtils.ts
├── functions/src/                # Backend (Cloud Functions)
│   ├── generateFicha.ts          # ★ Motor de PDF (54KB) - EL MÁS CRÍTICO
│   ├── index.ts                  # Entry point de funciones
│   ├── firestoreProxy.ts         # Proxy Firestore
│   └── driveDuplicateCleaner.ts  # Limpiador de Drive
├── check_*.cjs / get_*.cjs       # Scripts de auditoría (raíz)
├── plantilla-diseño.json         # Template del formulario
└── GAS_STRICT_SYNC.js            # Google Apps Script
```

## Conocimiento del Dominio
- **Entidad Pozo**: Nodo central. Metadatos de ubicación, inspección y estado físico.
- **Entidad Tubería**: Relación 1:N con Pozo. Campo `tipoTuberia` (ENTRADA/SALIDA). El campo `orden` determina posición en el PDF.
- **Entidad Sumidero**: Relación 1:N con Pozo. Dimensiones y estado propios.

## Reglas de Arquitectura
1. **Separación Client/Server**: El PDF de alta fidelidad se genera en Cloud Functions (`generateFicha.ts`), NUNCA en el frontend. El frontend solo tiene un exportador simple en `src/utils/export.ts`.
2. **Consistencia de IDs**: Siempre `PZ-XXXX` (mayúsculas). Los prefijos `PPZ` son legacy y deben ser migrados.
3. **Escalabilidad**: Al añadir campos nuevos, actualiza `plantilla-diseño.json` para que el formulario y el PDF los reconozcan.
4. **Fotos**: Siguen la convención `-E1`, `-S1`, `-SUM1` etc. La hidratación ocurre en `usePdfExport.ts` antes de enviar al backend.
