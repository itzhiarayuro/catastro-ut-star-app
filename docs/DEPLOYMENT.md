# Guía de Despliegue - UT STAR

## 🚀 Proceso de Despliegue

### Requisitos Previos

- Node.js 18+ instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Acceso al proyecto de Firebase
- Credenciales de Google Cloud configuradas

---

## 📦 Preparación del Entorno

### 1. Configuración de Variables de Entorno

**Archivo `.env.local` (NO commitear):**

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_GAS_DRIVE_SYNC_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
VITE_GAS_SECRET_TOKEN=tu-token-secreto-aqui
```

### 2. Verificar Dependencias

```bash
# Instalar dependencias
npm install

# Verificar que no haya vulnerabilidades críticas
npm audit

# Actualizar dependencias si es necesario
npm update
```

---

## 🏗️ Build de Producción

### 1. Compilar TypeScript y Build

```bash
# Limpiar build anterior (opcional)
rm -rf dist

# Build de producción
npm run build
```

**Salida esperada:**
```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── index.html
├── manifest.json
└── sw.js
```

### 2. Verificar Build Localmente

```bash
# Preview del build
npm run preview

# Abrir en navegador: http://localhost:4173
```

**Verificaciones:**
- [ ] La app carga correctamente
- [ ] Login funciona
- [ ] Captura de GPS funciona
- [ ] Captura de fotos funciona
- [ ] Sincronización funciona (con datos de prueba)

---

## 🔥 Despliegue a Firebase

### 1. Login a Firebase

```bash
firebase login
```

### 2. Seleccionar Proyecto

```bash
# Ver proyectos disponibles
firebase projects:list

# Seleccionar proyecto
firebase use tu-proyecto-id
```

### 3. Desplegar Hosting

```bash
# Desplegar solo hosting
firebase deploy --only hosting
```

**Salida esperada:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tu-proyecto-id/overview
Hosting URL: https://tu-proyecto-id.web.app
```

### 4. Desplegar Functions (si hay cambios)

```bash
# Desplegar solo functions
firebase deploy --only functions
```

### 5. Desplegar Firestore Rules (si hay cambios)

```bash
# Desplegar solo reglas
firebase deploy --only firestore:rules
```

### 6. Despliegue Completo

```bash
# Desplegar todo
firebase deploy
```

---

## 🧪 Verificación Post-Despliegue

### Checklist de Verificación

```bash
# 1. Verificar que el sitio esté accesible
curl -I https://tu-proyecto-id.web.app

# 2. Verificar certificado SSL
# Abrir en navegador y verificar candado verde

# 3. Verificar Service Worker
# DevTools → Application → Service Workers
# Debe aparecer "activated and is running"

# 4. Verificar Manifest
# DevTools → Application → Manifest
# Verificar que todos los campos estén correctos
```

### Pruebas Funcionales

- [ ] **Login**: Iniciar sesión con usuario de prueba
- [ ] **Crear ficha**: Crear una ficha de prueba
- [ ] **Capturar GPS**: Verificar que capture coordenadas
- [ ] **Capturar foto**: Tomar una foto de prueba
- [ ] **Guardar**: Guardar la ficha
- [ ] **Sincronizar**: Sincronizar con Firestore
- [ ] **Verificar en Firestore**: Confirmar que los datos llegaron
- [ ] **Verificar en Drive**: Confirmar que las fotos llegaron
- [ ] **Modo offline**: Desconectar WiFi y verificar que funcione
- [ ] **Mapa**: Verificar que el mapa cargue correctamente

---

## 🔄 Rollback

### En caso de problemas

```bash
# Ver historial de despliegues
firebase hosting:releases:list

# Rollback a versión anterior
firebase hosting:rollback
```

### Rollback Manual

```bash
# 1. Checkout a commit anterior
git checkout <commit-hash>

# 2. Build
npm run build

# 3. Desplegar
firebase deploy --only hosting
```

---

## 📊 Monitoreo Post-Despliegue

### Firebase Console

**Verificar:**
1. **Hosting**: https://console.firebase.google.com/project/tu-proyecto-id/hosting
   - Verificar que el despliegue esté activo
   - Revisar métricas de tráfico

2. **Firestore**: https://console.firebase.google.com/project/tu-proyecto-id/firestore
   - Verificar que las fichas se estén guardando
   - Revisar métricas de lecturas/escrituras

3. **Authentication**: https://console.firebase.google.com/project/tu-proyecto-id/authentication
   - Verificar que los usuarios puedan iniciar sesión
   - Revisar logs de autenticación

4. **Functions**: https://console.firebase.google.com/project/tu-proyecto-id/functions
   - Verificar que las functions estén activas
   - Revisar logs de ejecución

### Google Drive

**Verificar:**
1. Abrir carpeta raíz de Drive
2. Verificar que se estén creando carpetas de municipios
3. Verificar que las fotos se estén subiendo correctamente

---

## 🔐 Configuración de Seguridad

### Firestore Rules

**Verificar que estén activas:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fichas/{id} { 
      allow read, write: if request.auth != null; 
    }
    match /historial_fichas/{id} { 
      allow read, write: if request.auth != null; 
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Firebase Hosting Headers

**Verificar en `firebase.json`:**

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

---

## 🚨 Troubleshooting de Despliegue

### Error: "Build failed"

**Causa:** Error de compilación de TypeScript

**Solución:**
```bash
# Ver errores detallados
npm run build

# Corregir errores de TypeScript
# Volver a intentar
```

### Error: "Firebase deploy failed"

**Causa:** Permisos insuficientes o proyecto incorrecto

**Solución:**
```bash
# Verificar proyecto activo
firebase projects:list

# Cambiar proyecto si es necesario
firebase use tu-proyecto-id

# Verificar permisos
firebase login --reauth
```

### Error: "Service Worker not updating"

**Causa:** Caché del navegador

**Solución:**
```bash
# 1. Limpiar caché del navegador
# DevTools → Application → Clear storage

# 2. Hard refresh
# Ctrl + Shift + R (Windows/Linux)
# Cmd + Shift + R (Mac)

# 3. Verificar versión del Service Worker
# DevTools → Application → Service Workers
```

### Error: "Functions deployment failed"

**Causa:** Error en el código de functions o permisos

**Solución:**
```bash
# Ver logs de functions
firebase functions:log

# Verificar código de functions
cd functions
npm run build

# Desplegar solo functions
firebase deploy --only functions
```

---

## 📝 Checklist de Despliegue

### Pre-Despliegue
- [ ] Código revisado y aprobado
- [ ] Tests pasando (cuando estén implementados)
- [ ] Variables de entorno configuradas
- [ ] Build local exitoso
- [ ] Preview local verificado

### Despliegue
- [ ] Login a Firebase
- [ ] Proyecto correcto seleccionado
- [ ] Build de producción
- [ ] Deploy a Firebase
- [ ] Verificar URL de hosting

### Post-Despliegue
- [ ] Sitio accesible
- [ ] SSL activo
- [ ] Service Worker activo
- [ ] Pruebas funcionales pasando
- [ ] Firestore recibiendo datos
- [ ] Drive recibiendo fotos
- [ ] Modo offline funcionando

### Comunicación
- [ ] Notificar al equipo del despliegue
- [ ] Documentar cambios en changelog
- [ ] Actualizar versión en package.json

---

## 🔄 CI/CD (Recomendado)

### GitHub Actions

**Archivo `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_GAS_DRIVE_SYNC_URL: ${{ secrets.VITE_GAS_DRIVE_SYNC_URL }}
          VITE_GAS_SECRET_TOKEN: ${{ secrets.VITE_GAS_SECRET_TOKEN }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: tu-proyecto-id
```

**Configurar secrets en GitHub:**
1. Ir a Settings → Secrets and variables → Actions
2. Agregar todos los secrets necesarios

---

## 📊 Métricas de Despliegue

### KPIs a Monitorear

- **Tiempo de despliegue**: <5 minutos
- **Tasa de éxito**: >95%
- **Tiempo de rollback**: <2 minutos
- **Downtime**: 0 segundos (despliegue sin downtime)

### Logs a Revisar

```bash
# Logs de hosting
firebase hosting:logs

# Logs de functions
firebase functions:log

# Logs de Firestore
# Ver en Firebase Console
```

---

**Última actualización:** 2025  
**Versión:** 1.0.0
