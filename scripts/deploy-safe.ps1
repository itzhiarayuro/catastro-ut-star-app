# ============================================================
# deploy-safe.ps1 — Script de despliegue seguro para catastro-ut-star-app
# ============================================================
# ARQUITECTURA IMPORTANTE:
#   - catastro-ut-star.web.app     → app principal (este proyecto, dist/)
#   - sistema-fichas-tecnicas.web.app → app Next.js SEPARADA
#       Proyecto: scratch/sistema-fichas-tecnicas/sistema-fichas-tecnicas/
#       Desplegada con: firebase deploy --only hosting:sistema-fichas-tecnicas
#                       DESDE ESE DIRECTORIO, NO DESDE ESTE.
#
# PELIGRO: Este proyecto tiene AMBOS sitios en firebase.json apuntando
# al mismo dist/. Si haces `firebase deploy --only hosting` desde aquí,
# SOBREESCRIBES sistema-fichas-tecnicas.web.app con la app del catastro.
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "🔍 Verificando integridad antes de desplegar..." -ForegroundColor Cyan

# GUARDIA 1: Verificar que el botón Sistema de Fichas NO fue cambiado
$portalFile = "src\presentation\pages\PortalPage.tsx"
$content = Get-Content $portalFile -Raw

if ($content -notmatch "window\.open\('https://sistema-fichas-tecnicas\.web\.app'") {
    Write-Host ""
    Write-Host "❌ ERROR CRÍTICO: El botón 'Sistema de Fichas' en PortalPage.tsx fue modificado." -ForegroundColor Red
    Write-Host "   Debe usar: window.open('https://sistema-fichas-tecnicas.web.app', '_blank')" -ForegroundColor Yellow
    Write-Host "   NO usar setActiveScreen() — causa loop infinito." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Botón Sistema de Fichas: OK" -ForegroundColor Green

# GUARDIA 2: Advertir sobre el despliegue dual
Write-Host ""
Write-Host "⚠️  ADVERTENCIA: Este proyecto controla DOS sitios de hosting:" -ForegroundColor Yellow
Write-Host "   1. catastro-ut-star.web.app       (app principal — OK desplegar desde aquí)" -ForegroundColor White
Write-Host "   2. sistema-fichas-tecnicas.web.app (app Next.js SEPARADA — NO desplegar desde aquí)" -ForegroundColor Red
Write-Host ""
Write-Host "   Si despliegas ambos desde aquí, SOBREESCRIBES la app de fichas técnicas." -ForegroundColor Yellow
Write-Host ""

# GUARDIA 3: Preguntar qué desplegar
$choice = Read-Host "¿Qué deseas desplegar? [1=solo catastro-ut-star.web.app / 2=ambos (PELIGROSO)]"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "🚨 Elegiste desplegar AMBOS sitios. Esto sobreescribirá sistema-fichas-tecnicas.web.app" -ForegroundColor Red
    $confirm = Read-Host "¿Estás seguro? Escribe 'SI' para confirmar"
    if ($confirm -ne "SI") {
        Write-Host "Cancelado." -ForegroundColor Green
        exit 0
    }
}

# BUILD
Write-Host ""
Write-Host "🔨 Construyendo aplicación..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build fallido. No se desplegó nada." -ForegroundColor Red
    exit 1
}

# DEPLOY
if ($choice -eq "1") {
    Write-Host "🚀 Desplegando solo catastro-ut-star.web.app..." -ForegroundColor Cyan
    firebase deploy --only hosting:catastro-ut-star
} else {
    Write-Host "🚀 Desplegando ambos sitios..." -ForegroundColor Cyan
    firebase deploy --only hosting
}

Write-Host ""
Write-Host "✅ Despliegue completado." -ForegroundColor Green
Write-Host ""
Write-Host "📋 RECORDATORIOS POST-DESPLIEGUE:" -ForegroundColor Cyan
Write-Host "   • Si necesitas redesplegar la app de fichas técnicas, ve a:" -ForegroundColor White
Write-Host "     scratch/sistema-fichas-tecnicas/sistema-fichas-tecnicas/" -ForegroundColor Yellow
Write-Host "     y ejecuta: firebase deploy --only hosting:sistema-fichas-tecnicas" -ForegroundColor Yellow
