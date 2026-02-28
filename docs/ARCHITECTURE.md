# Arquitectura Técnica - UT STAR

## 📐 Visión General del Sistema

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Vite                        │  │
│  │  - PWA (Service Worker + Manifest)                   │  │
│  │  - TailwindCSS + Lucide Icons                        │  │
│  │  - Google Maps (@vis.gl/react-google-maps)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE ALMACENAMIENTO LOCAL                │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │  LocalStorage    │  │  IndexedDB                    │   │
│  │  - Fichas        │  │  - Fotos (Base64)             │   │
│  │  - Borradores    │  │  - Cola de sincronización     │   │
│  │  - Configuración │  │  - Metadata de fotos          │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE SINCRONIZACIÓN                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sincronización Nocturna                             │  │
│  │  - Validación de campos obligatorios                 │  │
│  │  - Compresión de fotos (fflate)                      │  │
│  │  - Batching (35MB por lote)                          │  │
│  │  - Reintentos con backoff exponencial                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      CAPA DE BACKEND                         │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │  Firebase        │  │  Google Apps Script           │   │
│  │  - Firestore     │  │  - Drive API                  │   │
│  │  - Auth          │  │  - Descompresión ZIP          │   │
│  │  - Hosting       │  │  - Organización de carpetas   │   │
│  │  - Functions     │  │  - Validación de token        │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   CAPA DE ALMACENAMIENTO CLOUD               │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │  Firestore       │  │  Google Drive                 │   │
│  │  - fichas/       │  │  - {Municipio}/               │   │
│  │  - historial_    │  │    - {Barrio}/                │   │
│  │    fichas/       │  │      - {Pozo}/                │   │
│  │  - tuberias/     │  │        - foto1.jpg            │   │
│  │  - fotos/        │  │        - foto2.jpg            │   │
│  └──────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Componentes Principales

### 1. Frontend (React + TypeScript)

#### Estructura de Componentes

```
src/
├── App.tsx                    # Componente principal
├── components/
│   ├── LoginPage.tsx          # Autenticación
│   ├── FichasViewer.tsx       # Lista de fichas
│   ├── FotosZone.tsx          # Captura de fotos
│   ├── SyncScreen.tsx         # Sincronización nocturna
│   ├── MapasScreen.tsx        # Visualización geográfica
│   ├── PozoForm.tsx           # Formulario de pozo
│   ├── PozoHeader.tsx         # Encabezado de ficha
│   ├── GeometriaPozo.tsx      # Geometría del pozo
│   └── TuberiasForm.tsx       # Tuberías y sumideros
├── lib/
│   └── firebase.tsx           # Configuración Firebase
├── utils/
│   ├── driveSync.ts           # Sincronización Drive
│   ├── export.ts              # Exportación Excel/PDF
│   ├── fotoProcessor.ts       # Procesamiento de fotos
│   ├── storageManager.ts      # Gestión IndexedDB
│   └── syncRegistry.ts        # Registro de sincronización
└── main.tsx                   # Punto de entrada
```

#### Motor de Reglas (Rules Engine)

**Ubicación:** `src/App.tsx` (useEffect)

**Reglas Implementadas:**

```typescript
// 1. OCULTO → TODO bloqueado Desconocido
if (sistema === 'OCULTO') {
  camara = 'DESCONOCIDO';
  tapa.existe = 'DESCONOCIDO';
  cuerpo.existe = 'DESCONOCIDO';
  cono.existe = 'DESCONOCIDO';
  canu.existe = 'DESCONOCIDO';
  peld.existe = 'DESCONOCIDO';
}

// 2. SELLADO → Sistema/Tipo Cam bloqueado
if (estadoPozo === 'Sellado') {
  sistema = 'DESCONOCIDO';
  camara = 'DESCONOCIDO';
}

// 3. COLMATADO → Cañuela bloqueada
if (estadoPozo === 'Colmatado') {
  canu.existe = 'DESCONOCIDO';
}

// 4. INUNDADO → Tapa NO Desconocido
if (estadoPozo === 'Inundado') {
  if (tapa.existe === 'DESCONOCIDO') {
    tapa.existe = 'SI';
  }
}

// 5. SISTEMA DESCONOCIDO → Tipo Cam/Cañuela bloqueado
if (sistema === 'DESCONOCIDO' && estadoPozo !== 'Inundado') {
  camara = 'DESCONOCIDO';
  canu.existe = 'DESCONOCIDO';
}

// 6. RASANTE DESCONOCIDO → Relacionados bloqueado
if (rasante === 'DESCONOCIDO') {
  tapa.existe = 'DESCONOCIDO';
}

// 7. TIPO CAM DESCONOCIDO → Solo habilitado exterior
if (camara === 'DESCONOCIDO') {
  canu.existe = 'DESCONOCIDO';
}
```

**Características:**
- Ejecución reactiva (useEffect con dependencias)
- Actualización automática del estado
- Sin intervención del usuario
- Prevención de datos inconsistentes

---

### 2. Almacenamiento Local

#### LocalStorage

**Uso:** Datos de texto (fichas, configuración)

**Estructura:**

```javascript
// Borrador actual
localStorage.setItem('catastro_draft', JSON.stringify({
  id: 'F_1234567890',
  pozo: 'M076',
  municipio: 'Sopó',
  // ... resto de campos
}));

// Fichas guardadas
localStorage.setItem('fichas_star', JSON.stringify({
  'F_1234567890': { /* ficha 1 */ },
  'F_1234567891': { /* ficha 2 */ },
  // ...
}));

// Navegación
localStorage.setItem('catastro_active_screen', 'sForm');
localStorage.setItem('catastro_current_step', '2');

// Backup de emergencia
localStorage.setItem('backup_fichas_SOPO_M076', JSON.stringify({
  // ... datos de la ficha
}));
```

**Límites:**
- Capacidad: ~5-10MB (varía por navegador)
- Sincrónico (puede bloquear UI si es muy grande)
- No recomendado para fotos

#### IndexedDB

**Uso:** Fotos en cola de sincronización

**Estructura:**

```javascript
// Base de datos
DB_NAME: 'UT_STAR_STORAGE'
DB_VERSION: 1

// Object Store
PHOTO_STORE: 'fotos_pendientes'
keyPath: 'id'

// Registro de foto
{
  id: 'foto_1234567890_1',
  pozoId: 'M076',
  municipio: 'Sopó',
  barrio: 'Centro',
  filename: 'M076-G-001.JPG',
  blob: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  categoria: 'General',
  inspector: 'Juan Pérez',
  timestamp: 1704067200000,
  synced: false
}
```

**Operaciones:**

```typescript
// Guardar foto
await savePhotoToStorage(photo);

// Obtener fotos pendientes
const pending = await getPendingPhotos();

// Eliminar foto sincronizada
await deletePhotoFromStorage(id);

// Renombrar foto (cambio de ID de pozo)
await renamePhotoInStorage(id, newPozoId, newFilename);

// Contar fotos pendientes
const count = await getPendingPhotosCount();
```

**Límites:**
- Capacidad: Depende del espacio libre del dispositivo
- Recomendado: Mantener <1.5GB o <80 fotos
- Asincrónico (no bloquea UI)

---

### 3. Sincronización

#### Validación de Fichas

**Ubicación:** `src/utils/syncRegistry.ts`

**Función:** `validateFicha()`

```typescript
export const validateFicha = (f: any): boolean => {
  // Paso 1: Información General
  const step1 = f.pozo && f.barrio && f.direccion && 
                f.municipio && f.sistema && 
                f.gps?.lat && f.gps?.lng;
  
  // Paso 2: Geometría
  const step2 = f.camara && f.rasante && 
                f.diam > 0 && f.altura > 0;

  // Evitar valores "OTRO" sin contenido
  const isOtroCamara = f.camara === 'OTRO';
  const isOtroRasante = f.rasante === 'OTRO';

  return !!(step1 && step2 && !isOtroCamara && !isOtroRasante);
};
```

**Campos Obligatorios:**
- Paso 1: pozo, barrio, dirección, municipio, sistema, GPS
- Paso 2: cámara, rasante, diámetro, altura
- Tuberías: deA, diam, mat, estado, emboq
- Sumideros: tipo, estado, matRejilla, matCaja, diamTub, matTub

#### Sincronización de Fichas (Firestore)

**Ubicación:** `src/utils/syncRegistry.ts`

**Función:** `syncFichasToFirestore()`

**Flujo:**

```typescript
1. Filtrar fichas no sincronizadas que cumplan validación
2. Para cada ficha:
   a. Marcar como synced: true
   b. Llamar a persistFicha() que:
      - Guarda en fichas/{MUNICIPIO}_{POZO_ID}
      - Guarda en historial_fichas/{MUNICIPIO}_{POZO_ID}_{TIMESTAMP}
   c. Actualizar LocalStorage
3. Retornar fichas actualizadas
```

**Características:**
- Idempotente (se puede reintentar sin duplicar)
- Encola automáticamente si falla
- Usa merge: true para no sobrescribir campos no enviados

#### Sincronización de Fotos (Google Drive)

**Ubicación:** `src/utils/driveSync.ts`

**Función:** `syncPhotosToDrive()`

**Flujo:**

```typescript
1. Obtener fotos pendientes de IndexedDB
2. Agrupar en lotes de ~35MB
3. Para cada lote:
   a. Convertir Base64 a Uint8Array
   b. Comprimir con fflate (ZIP)
   c. Convertir ZIP a Base64
   d. Enviar a Google Apps Script
   e. Marcar fotos como sincronizadas
   f. Eliminar de IndexedDB
4. Reportar progreso
```

**Características:**
- Batching para evitar timeouts
- Compresión ZIP para reducir ancho de banda
- Reintentos automáticos con backoff
- Subida idempotente (no duplica fotos)

---

### 4. Backend (Firebase)

#### Firestore

**Colecciones:**

```
firestore/
├── fichas/
│   ├── SOPO_M076
│   ├── SOPO_M077
│   └── SIBATE_P001
├── historial_fichas/
│   ├── SOPO_M076_1704067200000
│   ├── SOPO_M076_1704153600000
│   └── SOPO_M077_1704067200000
├── tuberias/
│   └── (legacy, no usado actualmente)
└── fotos/
    └── (legacy, no usado actualmente)
```

**Reglas de Seguridad:**

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

**Persistencia Offline:**

```typescript
// Habilitada automáticamente
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence already enabled in another tab.');
  }
});
```

**Sincronización en Tiempo Real:**

El mapa utiliza `onSnapshot` para actualizaciones en tiempo real:

```typescript
const q = query(collection(db, 'fichas'));
const unsubscribe = onSnapshot(q, (snapshot) => {
  // Actualiza marcadores automáticamente
  const items = snapshot.docs.map(doc => doc.data());
  setFichas(items);
});
```

**Características:**
- ✅ Actualizaciones en tiempo real sin recargar
- ✅ Múltiples usuarios ven cambios instantáneamente
- ✅ Funciona offline con caché local

#### Firebase Authentication

**Método:** Email + Password

**Flujo:**

```typescript
1. Usuario ingresa email y contraseña
2. signInWithEmailAndPassword(auth, email, password)
3. Firebase valida credenciales
4. Retorna token JWT (válido ~1 hora)
5. Token se almacena en localStorage
6. Token se refresca automáticamente si hay conexión
```

**Gestión de Sesión:**

```typescript
onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    setUser({ 
      email: firebaseUser.email, 
      name: firebaseUser.displayName 
    });
    setIsAuthorized(true);
  } else {
    setUser(null);
    setIsAuthorized(false);
  }
});
```

#### Firebase Functions

**Ubicación:** `functions/src/index.ts`

**Función:** `syncPhotosToDrive`

**Trigger:** `onWrite` en colección `fichas`

**Flujo:**

```typescript
1. Detectar cambio en ficha
2. Verificar si hay fotos nuevas (sin driveId)
3. Autenticar con Service Account
4. Crear/obtener estructura de carpetas:
   - Raíz → Municipio → Barrio → Pozo
5. Para cada foto:
   a. Convertir Base64 a Buffer
   b. Subir a Google Drive
   c. Obtener driveId
   d. Actualizar fotoList en Firestore
6. Marcar lastSyncAt
```

**Características:**
- Ejecución automática (sin intervención del usuario)
- Idempotente (no duplica fotos)
- Usa Service Account para autenticación
- Organiza fotos en estructura jerárquica

---

### 5. Google Apps Script (Drive Sync)

**Endpoint:** `VITE_GAS_DRIVE_SYNC_URL`

**Método:** `doPost(e)`

**Flujo:**

```javascript
1. Recibir POST con:
   - token: SECRET_TOKEN
   - zipData: Base64 del ZIP
   - metadata: Array de metadatos de fotos

2. Validar token

3. Descomprimir ZIP

4. Para cada foto:
   a. Crear/obtener carpeta Municipio
   b. Crear/obtener carpeta Barrio
   c. Crear/obtener carpeta Pozo
   d. Subir foto a carpeta Pozo
   e. Retornar driveId

5. Retornar respuesta JSON
```

**Características:**
- Modo `no-cors` (no se puede leer respuesta)
- Validación de token para seguridad
- Creación automática de estructura de carpetas
- Manejo de errores con try/catch

---

## 🗺️ Componente de Mapas (Actualizado)

### MapasScreen.tsx

**Características Principales:**

#### 1. Ubicación en Tiempo Real

```typescript
// Marcador de ubicación del usuario (punto azul pulsante)
{userPos && (
  <AdvancedMarker position={userPos}>
    <div className="relative flex items-center justify-center">
      <div className="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-ping"></div>
      <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,132,255,1)]"></div>
    </div>
  </AdvancedMarker>
)}
```

**Funcionalidad:**
- Punto azul con efecto de pulso
- Actualización automática de posición
- Botón flotante para centrar en ubicación actual
- Animación mientras busca ubicación

#### 2. Sincronización en Tiempo Real

```typescript
useEffect(() => {
  const q = query(collection(db, 'fichas'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      // Procesar datos...
      return fichaMapItem;
    });
    setFichas(items);
  });
  return () => unsubscribe();
}, []);
```

**Características:**
- Actualizaciones instantáneas sin recargar
- Múltiples usuarios ven cambios en tiempo real
- Contador de fichas actualizado automáticamente

#### 3. Marcadores Personalizados

```typescript
// Custom pin marker (evita warnings de <gmp-pin> deprecado)
<div style={{ width: '30px', height: '42px' }}>
  <svg viewBox="0 0 30 42" width="30" height="42">
    <path
      d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z"
      fill={getPinColor(ficha.sistema)}
      stroke="#ffffff"
      strokeWidth="2"
    />
    <circle cx="15" cy="14" r="6" fill="#ffffff" opacity="0.9" />
  </svg>
</div>
```

**Colores por Sistema:**
- PLUVIAL: `#3b82f6` (Azul)
- RESIDUAL: `#64748b` (Gris)
- COMBINADO: `#a855f7` (Morado)
- OCULTO: `#f59e0b` (Ámbar)
- DESCONOCIDO: `#ef4444` (Rojo)

#### 4. Controles del Mapa

**Botón de Centrar:**
```typescript
const handleCenterMap = () => {
  if (userPos && map) {
    map.panTo(userPos);
    map.setZoom(18);
  } else {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(newPos);
        if (map) {
          map.panTo(newPos);
          map.setZoom(18);
        }
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  }
};
```

**Características:**
- Solicita ubicación solo cuando el usuario presiona el botón
- Evita violación de "User Gesture" (no solicita automáticamente)
- Animación visual mientras busca ubicación
- Zoom automático a nivel 18 (muy cercano)

#### 5. Estadísticas en Tiempo Real

```typescript
<div className="grid grid-cols-3 gap-2">
  <div className="bg-blue-500/10 rounded-xl p-2">
    <p className="text-[8px] text-blue-400">Pluvial</p>
    <p className="text-sm font-black">{fichas.filter(f => f.sistema === 'PLUVIAL').length}</p>
  </div>
  {/* ... más estadísticas */}
</div>
```

**Características:**
- Conteo automático por tipo de sistema
- Se oculta cuando hay InfoWindow abierta
- Actualización en tiempo real

#### 6. Variables de Entorno

```env
VITE_GOOGLE_MAPS_ID=tu_map_id_personalizado
```

**Uso:**
- ID de estilo personalizado de Google Maps
- Permite temas oscuros y personalizaciones
- Opcional (funciona sin él)

---

## 🔄 Flujos de Datos Críticos

### Flujo 1: Crear Nueva Ficha

```
1. Usuario presiona "Nueva Inspección"
   ↓
2. App genera ID único: F_{timestamp}
   ↓
3. Crea estado inicial con INITIAL_STATE
   ↓
4. Guarda en LocalStorage como 'catastro_draft'
   ↓
5. Navega a formulario (Paso 1)
   ↓
6. Usuario llena campos
   ↓
7. Auto-save cada 1.5s → LocalStorage
   ↓
8. Usuario presiona "Guardar"
   ↓
9. Validación de campos obligatorios
   ↓
10. Si completa → Guarda en 'fichas_star'
    Si incompleta → Guarda como borrador
   ↓
11. Si online → Intenta sincronizar a Firestore
    Si offline → Queda en cola local
```

### Flujo 2: Captura de Foto

```
1. Usuario presiona botón de cámara
   ↓
2. Solicita permisos de cámara
   ↓
3. Abre interfaz de cámara del navegador
   ↓
4. Usuario toma foto
   ↓
5. Convierte a Base64
   ↓
6. Genera nombre: {POZO_ID}-{CATEGORIA}-{SEQ}.JPG
   ↓
7. Crea objeto PendingPhoto
   ↓
8. Guarda en IndexedDB
   ↓
9. Actualiza fotoList en estado
   ↓
10. Guarda estado en LocalStorage
```

### Flujo 3: Sincronización Nocturna

```
1. Usuario presiona "Sincronización Nocturna"
   ↓
2. Muestra resumen:
   - Fichas listas para subir
   - Fichas incompletas
   - Fichas ya sincronizadas
   ↓
3. Usuario presiona "Comenzar Ahora"
   ↓
4. Activa Wake Lock (pantalla no se apaga)
   ↓
5. FASE 1: Sincronizar Fichas
   a. Filtrar fichas no sincronizadas válidas
   b. Para cada ficha:
      - Subir a Firestore (fichas + historial)
      - Marcar como synced: true
      - Actualizar LocalStorage
   ↓
6. FASE 2: Sincronizar Fotos
   a. Obtener fotos pendientes de IndexedDB
   b. Agrupar en lotes de 35MB
   c. Para cada lote:
      - Comprimir con fflate
      - Enviar a Google Apps Script
      - Marcar como sincronizadas
      - Eliminar de IndexedDB
   ↓
7. Mostrar "Sincronización Exitosa"
   ↓
8. Liberar Wake Lock
```

### Flujo 4: Motor de Reglas

```
1. Usuario cambia campo (ej: estadoPozo = 'OCULTO')
   ↓
2. useEffect detecta cambio en dependencias
   ↓
3. Evalúa reglas en orden de prioridad
   ↓
4. Si regla aplica:
   a. Crea nuevo estado con campos bloqueados
   b. Marca changed = true
   ↓
5. Si changed:
   a. Actualiza estado con setState()
   b. Trigger re-render
   c. Campos bloqueados aparecen deshabilitados
   ↓
6. Usuario ve campos bloqueados en UI
```

---

## 🔐 Seguridad

### Autenticación

**Método:** Firebase Authentication (Email + Password)

**Tokens:**
- JWT válido ~1 hora
- Refresco automático si hay conexión
- Almacenado en localStorage

**Protección:**
- Reglas de Firestore requieren `request.auth != null`
- Google Apps Script valida `SECRET_TOKEN`
- Service Worker no cachea datos sensibles

### Datos Sensibles

**Variables de Entorno:**
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_GAS_DRIVE_SYNC_URL
VITE_GAS_SECRET_TOKEN
```

**Protección:**
- Archivo `.env.local` en `.gitignore`
- No commitear credenciales al repositorio
- Rotar tokens periódicamente

### Reglas de Firestore

**Principio:** Deny by default

```javascript
// Permitir solo si autenticado
match /fichas/{id} { 
  allow read, write: if request.auth != null; 
}

// Denegar todo lo demás
match /{document=**} {
  allow read, write: if false;
}
```

---

## 📊 Rendimiento

### Optimizaciones Implementadas

1. **Auto-save con debounce (1.5s)**
   - Evita escrituras excesivas a LocalStorage
   - Mejora UX (no bloquea UI)

2. **Lazy loading de componentes**
   - Exportaciones (Excel/PDF) se cargan bajo demanda
   - Reduce bundle inicial

3. **Batching de fotos (35MB)**
   - Evita timeouts en Google Apps Script
   - Reduce número de requests

4. **Compresión ZIP**
   - Reduce ancho de banda
   - Acelera subida de fotos

5. **IndexedDB para fotos**
   - No bloquea UI (asincrónico)
   - Mayor capacidad que LocalStorage

6. **Persistencia offline de Firestore**
   - Cachea datos localmente
   - Reduce latencia de lectura

### Límites y Cuotas

| Recurso | Límite | Acción al Exceder |
|---------|--------|-------------------|
| LocalStorage | ~5-10MB | Limpiar borradores antiguos |
| IndexedDB | Espacio libre del dispositivo | Advertencia a los 1.5GB |
| Firestore | 1 escritura/segundo por documento | Encola automáticamente |
| Google Apps Script | 40MB por request | Batching de 35MB |
| Firebase Auth | 1 token/hora | Refresco automático |

---

## 🧪 Testing

### Estrategia de Testing

**Actualmente:**
- Testing manual por inspectores
- Reportes verbales de errores

**Recomendado:**
- Unit tests (Jest + React Testing Library)
- Integration tests (Cypress)
- E2E tests (Playwright)
- Property-based testing (fast-check)

### Áreas Críticas para Testing

1. **Motor de Reglas**
   - Verificar que reglas se apliquen correctamente
   - Probar todas las combinaciones de estados

2. **Sincronización**
   - Verificar idempotencia
   - Probar reintentos con fallos simulados
   - Validar integridad de datos

3. **Almacenamiento Local**
   - Verificar persistencia
   - Probar límites de capacidad
   - Validar recuperación de errores

4. **Validación de Fichas**
   - Verificar campos obligatorios
   - Probar casos edge (valores nulos, vacíos)

---

## 📈 Monitoreo (Roadmap)

### Herramientas Recomendadas

1. **Sentry**
   - Captura de errores de JavaScript
   - Stack traces completos
   - Alertas en tiempo real

2. **Firebase Performance Monitoring**
   - Tiempos de carga
   - Latencia de red
   - Rendimiento de queries

3. **BigQuery + Looker Studio**
   - Dashboard operativo
   - Métricas de negocio
   - Análisis de tendencias

4. **Cloud Scheduler + Cloud Functions**
   - Alertas proactivas
   - Verificación de salud
   - Notificaciones automáticas

---

## 🔄 Versionado y Despliegue

### Estrategia de Versionado

**Actual:** Manual

**Proceso:**
1. Desarrollador hace cambios
2. `npm run build`
3. `firebase deploy`
4. Service Worker detecta nueva versión
5. Inspectores cierran y reabren app

**Recomendado:**
- Semantic Versioning (MAJOR.MINOR.PATCH)
- Changelog automático
- CI/CD con GitHub Actions

### Rollback

**Proceso:**
```bash
# Ver historial de despliegues
firebase hosting:releases:list

# Rollback a versión anterior
firebase hosting:rollback
```

---

## 📚 Referencias Técnicas

### Documentación Oficial

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/docs)
- [Google Maps API](https://developers.google.com/maps)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### Librerías Clave

- `firebase`: SDK de Firebase
- `@vis.gl/react-google-maps`: Componentes de Google Maps
- `fflate`: Compresión/descompresión ZIP
- `exifr`: Extracción de metadatos EXIF
- `lucide-react`: Iconos
- `tailwindcss`: Framework CSS

---

**Última actualización:** 2025  
**Versión:** 1.0.0
