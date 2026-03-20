---
description: how to deploy the application safely
---

# ⚠️ ARQUITECTURA CRÍTICA — LEER ANTES DE DESPLEGAR

Este proyecto (`catastro-ut-star-app`) tiene **DOS sitios de Firebase Hosting** en su `firebase.json`, ambos apuntando al mismo `dist/`:

| Sitio | URL | Proyecto fuente |
|---|---|---|
| `catastro-ut-star` | https://catastro-ut-star.web.app | Este proyecto (Vite/React) |
| `sistema-fichas-tecnicas` | https://sistema-fichas-tecnicas.web.app | **App Next.js SEPARADA** |

**La app de fichas técnicas está en:**
`scratch/sistema-fichas-tecnicas/sistema-fichas-tecnicas/`

> ❌ Si haces `firebase deploy --only hosting` desde `catastro-ut-star-app`, **SOBREESCRIBES** `sistema-fichas-tecnicas.web.app` con la app del catastro — causando un loop infinito cuando el usuario hace clic en el botón "Sistema de Fichas".
> Esto ocurrió 3 veces. No repetir.

---

## Desplegar solo la app principal (catastro)

// turbo
1. Ejecutar desde `catastro-ut-star-app/`:
```powershell
npm run build ; if($LASTEXITCODE -eq 0) { firebase deploy --only hosting:catastro-ut-star }
```

---

## Desplegar la app de fichas técnicas (Next.js)

1. Ir al proyecto correcto:
```powershell
cd 'c:\Users\ICA2025\.gemini\antigravity\scratch\sistema-fichas-tecnicas\sistema-fichas-tecnicas'
```

// turbo
2. Construir y desplegar:
```powershell
npm run build ; if($LASTEXITCODE -eq 0) { firebase deploy --only hosting:sistema-fichas-tecnicas }
```

---

## Botón "Sistema de Fichas" en PortalPage.tsx — REGLA SAGRADA

El `onClick` de este botón **siempre debe ser**:
```tsx
onClick={() => window.open('https://sistema-fichas-tecnicas.web.app', '_blank')}
```

**Nunca** reemplazar con `setActiveScreen(...)`. Causa loop porque ambas URLs sirven la misma SPA.

---

## Script de despliegue seguro (con validaciones)

```powershell
.\scripts\deploy-safe.ps1
```
Este script valida que el botón no fue modificado antes de desplegar.
