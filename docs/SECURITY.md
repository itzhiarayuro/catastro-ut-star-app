# Guía de Seguridad - UT STAR

## 🔐 Principios de Seguridad

Este documento describe las medidas de seguridad implementadas en la aplicación UT STAR y las mejores prácticas para mantener la seguridad del sistema.

---

## 🛡️ Arquitectura de Seguridad

### Capas de Seguridad

```
┌─────────────────────────────────────────┐
│  Capa 1: Autenticación (Firebase Auth)  │
│  - Email + Password                      │
│  - Tokens JWT                            │
│  - Sesión persistente                    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Capa 2: Autorización (Firestore Rules) │
│  - Require auth != null                  │
│  - Deny by default                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Capa 3: Validación (Google Apps Script)│
│  - Token secreto                         │
│  - Validación de payload                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Capa 4: Transporte (HTTPS/TLS)         │
│  - Certificado SSL                       │
│  - Encriptación en tránsito              │
└─────────────────────────────────────────┘
```

---

## 🔑 Autenticación

### Firebase Authentication

**Método:** Email + Password

**Flujo de Autenticación:**

```typescript
1. Usuario ingresa credenciales
2. Firebase valida contra base de datos de usuarios
3. Si válido → Genera token JWT
4. Token se almacena en localStorage
5. Token se incluye en todas las peticiones a Firestore
6. Token expira en ~1 hora
7. Refresco automático si hay conexión
```

**Características de Seguridad:**

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT firmados
- ✅ Expiración automática de tokens
- ✅ Refresco automático de tokens
- ✅ Logout limpia tokens locales

### Gestión de Usuarios

**Creación de Usuarios:**
- Solo administradores pueden crear usuarios
- Proceso manual (no hay auto-registro)
- Contraseñas deben cumplir requisitos mínimos

**Requisitos de Contraseña:**
- Mínimo 6 caracteres (Firebase default)
- Recomendado: 8+ caracteres con mayúsculas, minúsculas y números

**Revocación de Acceso:**
```bash
# Deshabilitar usuario en Firebase Console
# O usar Firebase Admin SDK
```

---

## 🔒 Autorización

### Reglas de Firestore

**Principio:** Deny by default

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir solo si autenticado
    match /fichas/{id} { 
      allow read, write: if request.auth != null; 
    }
    
    match /historial_fichas/{id} { 
      allow read, write: if request.auth != null; 
    }
    
    // Denegar todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Características:**
- ✅ Requiere autenticación para todas las operaciones
- ✅ No hay acceso público
- ✅ Deny by default para colecciones no especificadas

### Roles y Permisos

**Actualmente:**
- Todos los inspectores tienen los mismos permisos
- No hay diferenciación de roles

**Recomendado (Roadmap):**

```javascript
// Ejemplo de reglas con roles
match /fichas/{id} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'inspector' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
  allow delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## 🔐 Protección de Datos Sensibles

### Variables de Entorno

**Archivo `.env.local` (NUNCA commitear):**

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GAS_DRIVE_SYNC_URL=...
VITE_GAS_SECRET_TOKEN=...
```

**Protección:**

```gitignore
# .gitignore
.env.local
.env.*.local
```

**Rotación de Credenciales:**
- Rotar tokens cada 90 días
- Rotar contraseñas de usuarios cada 180 días
- Rotar Service Account keys cada año

### Datos en Tránsito

**HTTPS/TLS:**
- ✅ Certificado SSL automático (Firebase Hosting)
- ✅ Forzar HTTPS (redirect automático)
- ✅ TLS 1.2+ requerido

**Headers de Seguridad:**

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
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          }
        ]
      }
    ]
  }
}
```

### Datos en Reposo

**LocalStorage:**
- ⚠️ No encriptado (limitación del navegador)
- ✅ Solo accesible por el mismo origen
- ✅ No contiene contraseñas (solo tokens)

**IndexedDB:**
- ⚠️ No encriptado (limitación del navegador)
- ✅ Solo accesible por el mismo origen
- ✅ Fotos en Base64 (no sensibles)

**Firestore:**
- ✅ Encriptación en reposo (automática)
- ✅ Encriptación en tránsito (TLS)
- ✅ Backups encriptados

**Google Drive:**
- ✅ Encriptación en reposo (automática)
- ✅ Encriptación en tránsito (TLS)
- ✅ Acceso controlado por Service Account

---

## 🚨 Detección de Amenazas

### Monitoreo de Seguridad

**Firebase Console:**
- Revisar logs de autenticación
- Detectar intentos de login fallidos
- Monitorear actividad inusual

**Alertas Recomendadas:**
- Múltiples intentos de login fallidos
- Acceso desde ubicaciones inusuales
- Cambios en reglas de Firestore
- Despliegues no autorizados

### Auditoría

**Logs a Revisar:**

```bash
# Logs de autenticación
# Firebase Console → Authentication → Users

# Logs de Firestore
# Firebase Console → Firestore → Usage

# Logs de Functions
firebase functions:log

# Logs de Hosting
firebase hosting:logs
```

**Retención de Logs:**
- Firebase: 30 días (default)
- Recomendado: Exportar a BigQuery para retención extendida

---

## 🛡️ Protección contra Ataques

### XSS (Cross-Site Scripting)

**Protección:**
- ✅ React escapa automáticamente el contenido
- ✅ No usar `dangerouslySetInnerHTML`
- ✅ Validar inputs del usuario
- ✅ Header `X-XSS-Protection`

### CSRF (Cross-Site Request Forgery)

**Protección:**
- ✅ Firebase Auth tokens incluyen origen
- ✅ SameSite cookies (automático)
- ✅ Validación de origen en GAS

### Injection Attacks

**Protección:**
- ✅ Firestore usa queries parametrizadas
- ✅ No hay SQL directo
- ✅ Validación de inputs

### DDoS (Distributed Denial of Service)

**Protección:**
- ✅ Firebase Hosting tiene protección DDoS
- ✅ Rate limiting automático
- ✅ CDN global (Firebase)

---

## 🔐 Google Apps Script Security

### Validación de Token

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  
  // Validar token secreto
  if (data.token !== SECRET_TOKEN) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Unauthorized' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Procesar request...
}
```

### Service Account

**Protección:**
- ✅ Service Account con permisos mínimos
- ✅ Key almacenada en Firebase Secrets
- ✅ No expuesta en código fuente
- ✅ Rotación anual de keys

**Permisos Mínimos:**
- Solo acceso a carpeta específica de Drive
- No acceso a otros servicios de Google

---

## 📋 Checklist de Seguridad

### Desarrollo

- [ ] Variables de entorno en `.env.local`
- [ ] `.env.local` en `.gitignore`
- [ ] No hay credenciales en código fuente
- [ ] Validación de inputs del usuario
- [ ] Escape de contenido dinámico
- [ ] HTTPS en todos los endpoints

### Despliegue

- [ ] Reglas de Firestore activas
- [ ] Headers de seguridad configurados
- [ ] Certificado SSL activo
- [ ] Service Account con permisos mínimos
- [ ] Tokens secretos rotados

### Operación

- [ ] Monitoreo de logs activo
- [ ] Alertas configuradas
- [ ] Backups automáticos
- [ ] Plan de respuesta a incidentes
- [ ] Auditorías periódicas

---

## 🚨 Respuesta a Incidentes

### Proceso de Respuesta

**1. Detección:**
- Monitoreo detecta actividad sospechosa
- Usuario reporta problema de seguridad
- Auditoría revela vulnerabilidad

**2. Contención:**
```bash
# Deshabilitar usuario comprometido
# Firebase Console → Authentication → Users → Disable

# Revocar tokens
# Firebase Console → Authentication → Sign-in method → Revoke

# Cambiar credenciales
# Rotar API keys, tokens, Service Account keys
```

**3. Investigación:**
- Revisar logs de autenticación
- Revisar logs de Firestore
- Identificar alcance del incidente
- Documentar hallazgos

**4. Remediación:**
- Corregir vulnerabilidad
- Desplegar fix
- Verificar que el problema esté resuelto

**5. Comunicación:**
- Notificar a usuarios afectados
- Documentar incidente
- Actualizar procedimientos

---

## 🔄 Mejores Prácticas

### Para Desarrolladores

✅ **Hacer:**
- Usar variables de entorno para credenciales
- Validar todos los inputs del usuario
- Usar HTTPS en todos los endpoints
- Mantener dependencias actualizadas
- Revisar código antes de desplegar
- Usar linter de seguridad (ESLint)

❌ **Evitar:**
- Commitear credenciales al repositorio
- Usar `dangerouslySetInnerHTML`
- Deshabilitar validación de SSL
- Usar dependencias desactualizadas
- Exponer información sensible en logs

### Para Administradores

✅ **Hacer:**
- Rotar credenciales periódicamente
- Revisar logs regularmente
- Mantener backups actualizados
- Configurar alertas de seguridad
- Auditar permisos de usuarios
- Mantener documentación actualizada

❌ **Evitar:**
- Compartir credenciales por email/chat
- Usar contraseñas débiles
- Ignorar alertas de seguridad
- Deshabilitar logs
- Dar permisos excesivos

### Para Usuarios (Inspectores)

✅ **Hacer:**
- Usar contraseñas fuertes
- No compartir credenciales
- Cerrar sesión en dispositivos compartidos
- Reportar actividad sospechosa
- Mantener dispositivo actualizado

❌ **Evitar:**
- Compartir contraseñas
- Usar contraseñas simples
- Dejar sesión abierta en dispositivos públicos
- Ignorar advertencias de seguridad

---

## 📚 Referencias

### Documentación Oficial

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Google Apps Script Security](https://developers.google.com/apps-script/guides/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Herramientas de Seguridad

- [Firebase Security Rules Simulator](https://firebase.google.com/docs/rules/simulator)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

---

## 🔄 Actualizaciones de Seguridad

### Proceso de Actualización

**Dependencias:**
```bash
# Verificar vulnerabilidades
npm audit

# Actualizar dependencias
npm update

# Actualizar dependencias con vulnerabilidades críticas
npm audit fix
```

**Firebase:**
- Revisar [Firebase Release Notes](https://firebase.google.com/support/release-notes)
- Actualizar SDK cuando haya fixes de seguridad
- Probar en ambiente de desarrollo antes de producción

---

**Última actualización:** 2025  
**Versión:** 1.0.0

**⚠️ IMPORTANTE:** Si descubres una vulnerabilidad de seguridad, NO la publiques públicamente. Contacta al equipo de desarrollo directamente.
