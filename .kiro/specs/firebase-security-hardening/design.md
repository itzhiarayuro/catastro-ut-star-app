# Documento de Diseño: Firebase Security Hardening

## Resumen Ejecutivo

Sistema de seguridad end-to-end para aplicación React + TypeScript + Firebase con repositorio Git público. Aborda 10 vectores de riesgo críticos identificados: credenciales expuestas, autenticación local insegura, reglas de Firestore abiertas, ausencia de gestión de secretos, y riesgo de leaks en Git. La solución implementa defensa en profundidad con múltiples capas: auditoría y limpieza de Git, gestión de secretos con variables de entorno, Firebase Authentication real, reglas de seguridad granulares, control de acceso multi-tenant, validación de esquemas, auditoría de operaciones, y prevención de futuros leaks mediante pre-commit hooks.

## Arquitectura de Seguridad

### Vista General del Sistema

```mermaid
graph TB
    subgraph "Cliente (React + TypeScript)"
        A[Aplicación Web]
        B[Service Worker PWA]
        C[IndexedDB Local]
    end
    
    subgraph "Capa de Autenticación"
        D[Firebase Auth]
        E[Custom Claims]
        F[Session Management]
    end
    
    subgraph "Capa de Autorización"
        G[Firestore Security Rules]
        H[Storage Security Rules]
        I[Cloud Functions Auth Middleware]
    end
    
    subgraph "Backend Serverless"
        J[Cloud Functions]
        K[Secret Manager]
        L[Audit Logger]
    end
    
    subgraph "Almacenamiento"
        M[Firestore]
        N[Firebase Storage]
        O[Google Drive API]
    end
    
    subgraph "Seguridad Git"
        P[Pre-commit Hooks]
        Q[Gitleaks Scanner]
        R[.gitignore Hardened]
    end
    
    A --> D
    D --> E
    E --> G
    E --> H
    A --> J
    J --> K
    J --> L
    J --> M
    J --> N
    J --> O
    G --> M
    H --> N
    A --> C
    B --> C
    P --> Q
    Q --> R
```

### Flujo de Autenticación y Autorización

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App React
    participant FA as Firebase Auth
    participant CF as Cloud Function
    participant FS as Firestore
    participant SM as Secret Manager
    
    U->>A: Ingresa credenciales
    A->>FA: signInWithEmailAndPassword()
    FA->>FA: Valida credenciales
    FA->>CF: onCreate trigger
    CF->>SM: Obtiene configuración tenant
    CF->>FA: setCustomUserClaims(uid, {tenant, role})
    FA-->>A: Token JWT con claims
    A->>FS: Query con auth context
    FS->>FS: Evalúa Security Rules
    FS->>FS: Verifica request.auth.token.tenant
    FS-->>A: Datos autorizados
    A-->>U: Interfaz actualizada
```

### Flujo de Auditoría de Operaciones Sensibles

```mermaid
sequenceDiagram
    participant A as App
    participant CF as Cloud Function
    participant FS as Firestore
    participant AL as Audit Log Collection
    
    A->>CF: Operación sensible (delete, update crítico)
    CF->>CF: Valida permisos
    CF->>FS: Ejecuta operación
    CF->>AL: Registra evento de auditoría
    AL->>AL: Almacena: {user, action, timestamp, resource, result}
    CF-->>A: Respuesta + audit_id
```

## Componentes y Interfaces

### 1. Gestión de Secretos y Variables de Entorno

**Propósito**: Eliminar credenciales hardcodeadas y gestionar secretos de forma segura

**Estructura de archivos**:

```typescript
// .env.local (NUNCA commitear)
VITE_FIREBASE_API_KEY=AIzaSyClaOKQqLG6-KBNcVaAD_QYlBjeKyP3i2c
VITE_FIREBASE_AUTH_DOMAIN=catastro-ut-star.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catastro-ut-star
VITE_FIREBASE_STORAGE_BUCKET=catastro-ut-star.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=691178303694
VITE_FIREBASE_APP_ID=1:691178303694:web:778ae824c94020f990209f
VITE_GOOGLE_MAPS_API_KEY=AIzaSyClaOKQqLG6-KBNcVaAD_QYlBjeKyP3i2c

// .env.example (SÍ commitear como template)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

**Interface de configuración**:

```typescript
// src/config/firebase.config.ts
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const getFirebaseConfig = (): FirebaseConfig => {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  
  // Validación en desarrollo
  if (import.meta.env.DEV) {
    Object.entries(config).forEach(([key, value]) => {
      if (!value || value.includes('your_')) {
        throw new Error(`Missing or invalid Firebase config: ${key}`);
      }
    });
  }
  
  return config;
};
```

**Responsabilidades**:
- Cargar variables de entorno de forma segura
- Validar configuración en tiempo de ejecución
- Prevenir exposición de secretos en código fuente
- Proporcionar configuración type-safe

### 2. Sistema de Autenticación con Firebase Auth

**Propósito**: Reemplazar autenticación local hardcodeada con Firebase Authentication real

**Interface de autenticación**:

```typescript
// src/lib/auth.ts
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  tenant: string;
  role: 'admin' | 'inspector' | 'viewer';
  customClaims?: Record<string, any>;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export class AuthService {
  private auth = getAuth();
  
  async login(email: string, password: string): Promise<UserProfile> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const token = await credential.user.getIdTokenResult();
    
    return {
      uid: credential.user.uid,
      email: credential.user.email!,
      displayName: credential.user.displayName || email,
      tenant: token.claims.tenant as string,
      role: token.claims.role as 'admin' | 'inspector' | 'viewer',
      customClaims: token.claims
    };
  }
  
  async logout(): Promise<void> {
    await signOut(this.auth);
  }
  
  async refreshToken(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await user.getIdToken(true);
    }
  }
  
  onAuthChange(callback: (user: UserProfile | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdTokenResult();
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || firebaseUser.email!,
          tenant: token.claims.tenant as string,
          role: token.claims.role as 'admin' | 'inspector' | 'viewer',
          customClaims: token.claims
        });
      } else {
        callback(null);
      }
    });
  }
}
```

**Responsabilidades**:
- Autenticación con email/password usando Firebase Auth
- Gestión de sesiones con tokens JWT
- Manejo de custom claims para autorización
- Refresh automático de tokens
- Logout seguro

### 3. Control de Acceso Multi-Tenant

**Propósito**: Aislar datos por empresa/tenant y controlar acceso granular por roles

**Modelo de datos de tenant**:

```typescript
// Estructura de colecciones multi-tenant
interface TenantConfig {
  tenantId: string;
  name: string;
  active: boolean;
  createdAt: string;
  settings: {
    maxUsers: number;
    features: string[];
    storageQuotaMB: number;
  };
}

interface UserTenantMapping {
  uid: string;
  email: string;
  tenantId: string;
  role: 'admin' | 'inspector' | 'viewer';
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

interface FichaDocument {
  // Campos existentes
  pozo: string;
  municipio: string;
  barrio: string;
  
  // Nuevos campos de seguridad
  tenantId: string;  // CRÍTICO: Identifica a qué empresa pertenece
  createdBy: string; // UID del usuario creador
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  
  // Control de acceso
  visibility: 'private' | 'tenant' | 'public';
  sharedWith: string[]; // UIDs con acceso explícito
}
```

**Cloud Function para asignar custom claims**:

```typescript
// functions/src/auth/setUserClaims.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  // Buscar configuración del usuario en Firestore
  const userDoc = await admin.firestore()
    .collection('user_tenant_mappings')
    .doc(user.uid)
    .get();
  
  if (!userDoc.exists) {
    console.warn(`No tenant mapping found for user ${user.uid}`);
    return;
  }
  
  const userData = userDoc.data()!;
  
  // Asignar custom claims
  await admin.auth().setCustomUserClaims(user.uid, {
    tenant: userData.tenantId,
    role: userData.role,
    permissions: userData.permissions
  });
  
  console.log(`Custom claims set for user ${user.uid}: tenant=${userData.tenantId}, role=${userData.role}`);
});

export const updateUserClaims = functions.https.onCall(async (data, context) => {
  // Solo admins pueden actualizar claims
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update user claims');
  }
  
  const { uid, tenant, role, permissions } = data;
  
  await admin.auth().setCustomUserClaims(uid, {
    tenant,
    role,
    permissions
  });
  
  return { success: true, message: 'Claims updated successfully' };
});
```

**Responsabilidades**:
- Asignar tenant y role a usuarios nuevos
- Actualizar custom claims cuando cambian permisos
- Validar que solo admins puedan modificar claims
- Registrar cambios en audit log

### 4. Reglas de Seguridad de Firestore

**Propósito**: Implementar autorización granular a nivel de base de datos

**Reglas de seguridad robustas**:

```javascript
// firestore.rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserTenant() {
      return request.auth.token.tenant;
    }
    
    function getUserRole() {
      return request.auth.token.role;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }
    
    function isInspector() {
      return isAuthenticated() && (getUserRole() == 'inspector' || getUserRole() == 'admin');
    }
    
    function belongsToTenant(tenantId) {
      return isAuthenticated() && getUserTenant() == tenantId;
    }
    
    function isOwner(uid) {
      return isAuthenticated() && request.auth.uid == uid;
    }
    
    function validateFichaSchema(data) {
      return data.keys().hasAll(['pozo', 'municipio', 'tenantId', 'createdBy', 'createdAt']) &&
             data.pozo is string && data.pozo.size() > 0 &&
             data.municipio is string && data.municipio.size() > 0 &&
             data.tenantId is string &&
             data.createdBy is string;
    }
    
    // Colección de fichas - Multi-tenant con validación
    match /fichas/{fichaId} {
      allow read: if isAuthenticated() && 
                     (belongsToTenant(resource.data.tenantId) || 
                      resource.data.visibility == 'public' ||
                      request.auth.uid in resource.data.get('sharedWith', []));
      
      allow create: if isInspector() && 
                       validateFichaSchema(request.resource.data) &&
                       request.resource.data.tenantId == getUserTenant() &&
                       request.resource.data.createdBy == request.auth.uid;
      
      allow update: if isInspector() && 
                       belongsToTenant(resource.data.tenantId) &&
                       (isOwner(resource.data.createdBy) || isAdmin()) &&
                       request.resource.data.tenantId == resource.data.tenantId; // No cambiar tenant
      
      allow delete: if isAdmin() && belongsToTenant(resource.data.tenantId);
    }
    
    // Colección de historial - Solo lectura para auditoría
    match /historial_fichas/{historyId} {
      allow read: if isAuthenticated() && belongsToTenant(resource.data.tenantId);
      allow write: if false; // Solo Cloud Functions pueden escribir
    }
    
    // Colección de tuberías - Similar a fichas
    match /tuberias/{tuberiaId} {
      allow read: if isAuthenticated() && belongsToTenant(resource.data.tenantId);
      allow create: if isInspector() && 
                       request.resource.data.tenantId == getUserTenant() &&
                       request.resource.data.createdBy == request.auth.uid;
      allow update: if isInspector() && 
                       belongsToTenant(resource.data.tenantId) &&
                       (isOwner(resource.data.createdBy) || isAdmin());
      allow delete: if isAdmin() && belongsToTenant(resource.data.tenantId);
    }
    
    // Colección de fotos - Metadata en Firestore, archivos en Storage
    match /fotos/{fotoId} {
      allow read: if isAuthenticated() && belongsToTenant(resource.data.tenantId);
      allow create: if isInspector() && 
                       request.resource.data.tenantId == getUserTenant();
      allow delete: if isAdmin() && belongsToTenant(resource.data.tenantId);
    }
    
    // Configuración de tenants - Solo admins
    match /tenants/{tenantId} {
      allow read: if isAuthenticated() && belongsToTenant(tenantId);
      allow write: if isAdmin() && belongsToTenant(tenantId);
    }
    
    // Mapeo usuario-tenant - Solo lectura propia
    match /user_tenant_mappings/{uid} {
      allow read: if isAuthenticated() && (isOwner(uid) || isAdmin());
      allow write: if isAdmin();
    }
    
    // Audit logs - Solo lectura para admins
    match /audit_logs/{logId} {
      allow read: if isAdmin() && belongsToTenant(resource.data.tenantId);
      allow write: if false; // Solo Cloud Functions
    }
    
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Responsabilidades**:
- Validar autenticación en todas las operaciones
- Verificar tenant en cada acceso a datos
- Validar roles y permisos
- Validar esquemas de datos en escrituras
- Prevenir modificación de campos críticos (tenantId)
- Proteger colecciones de auditoría

### 5. Reglas de Seguridad de Firebase Storage

**Propósito**: Controlar acceso a archivos subidos (fotos)

**Reglas de Storage**:

```javascript
// storage.rules
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserTenant() {
      return request.auth.token.tenant;
    }
    
    function isAdmin() {
      return request.auth.token.role == 'admin';
    }
    
    function isInspector() {
      return request.auth.token.role in ['inspector', 'admin'];
    }
    
    function isValidImageSize() {
      return request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
    
    function isValidImageType() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Estructura: /tenants/{tenantId}/fotos/{municipio}/{barrio}/{pozo}/{filename}
    match /tenants/{tenantId}/fotos/{allPaths=**} {
      allow read: if isAuthenticated() && getUserTenant() == tenantId;
      
      allow write: if isInspector() && 
                      getUserTenant() == tenantId &&
                      isValidImageSize() &&
                      isValidImageType();
      
      allow delete: if isAdmin() && getUserTenant() == tenantId;
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Responsabilidades**:
- Validar autenticación para acceso a archivos
- Verificar tenant en rutas de archivos
- Validar tipo y tamaño de archivos
- Prevenir uploads no autorizados
- Organizar archivos por tenant

### 6. Sistema de Auditoría

**Propósito**: Registrar operaciones sensibles para compliance y debugging

**Interface de auditoría**:

```typescript
// functions/src/audit/auditLogger.ts
interface AuditEvent {
  eventId: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ_SENSITIVE' | 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'PERMISSION_DENIED';
  resource: {
    type: 'ficha' | 'tuberia' | 'foto' | 'user' | 'tenant';
    id: string;
    path: string;
  };
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, any>;
    reason?: string;
  };
  result: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

export class AuditLogger {
  private db = admin.firestore();
  
  async logEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<string> {
    const auditEvent: AuditEvent = {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      ...event
    };
    
    const docRef = await this.db.collection('audit_logs').add(auditEvent);
    
    // También escribir en Cloud Logging para análisis
    console.log('AUDIT_EVENT', JSON.stringify(auditEvent));
    
    return docRef.id;
  }
  
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async queryLogs(filters: {
    tenantId: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    let query = this.db.collection('audit_logs')
      .where('tenantId', '==', filters.tenantId);
    
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    
    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }
    
    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }
    
    query = query.orderBy('timestamp', 'desc').limit(filters.limit || 100);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as AuditEvent);
  }
}
```

**Cloud Function con auditoría integrada**:

```typescript
// functions/src/fichas/deleteFicha.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AuditLogger } from '../audit/auditLogger';

const auditLogger = new AuditLogger();

export const deleteFicha = functions.https.onCall(async (data, context) => {
  // Validar autenticación
  if (!context.auth) {
    await auditLogger.logEvent({
      tenantId: 'unknown',
      userId: 'anonymous',
      userEmail: 'anonymous',
      action: 'PERMISSION_DENIED',
      resource: { type: 'ficha', id: data.fichaId, path: `/fichas/${data.fichaId}` },
      metadata: { reason: 'Not authenticated' },
      result: 'FAILURE',
      errorMessage: 'Authentication required'
    });
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  // Validar rol de admin
  if (context.auth.token.role !== 'admin') {
    await auditLogger.logEvent({
      tenantId: context.auth.token.tenant,
      userId: context.auth.uid,
      userEmail: context.auth.token.email || 'unknown',
      action: 'PERMISSION_DENIED',
      resource: { type: 'ficha', id: data.fichaId, path: `/fichas/${data.fichaId}` },
      metadata: { reason: 'Insufficient permissions', userRole: context.auth.token.role },
      result: 'FAILURE',
      errorMessage: 'Admin role required'
    });
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }
  
  const { fichaId } = data;
  const fichaRef = admin.firestore().collection('fichas').doc(fichaId);
  const fichaDoc = await fichaRef.get();
  
  if (!fichaDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Ficha not found');
  }
  
  const fichaData = fichaDoc.data()!;
  
  // Validar tenant
  if (fichaData.tenantId !== context.auth.token.tenant) {
    await auditLogger.logEvent({
      tenantId: context.auth.token.tenant,
      userId: context.auth.uid,
      userEmail: context.auth.token.email || 'unknown',
      action: 'PERMISSION_DENIED',
      resource: { type: 'ficha', id: fichaId, path: `/fichas/${fichaId}` },
      metadata: { 
        reason: 'Tenant mismatch', 
        userTenant: context.auth.token.tenant,
        resourceTenant: fichaData.tenantId 
      },
      result: 'FAILURE',
      errorMessage: 'Access denied to resource from different tenant'
    });
    throw new functions.https.HttpsError('permission-denied', 'Access denied');
  }
  
  // Ejecutar eliminación
  await fichaRef.delete();
  
  // Registrar auditoría exitosa
  await auditLogger.logEvent({
    tenantId: context.auth.token.tenant,
    userId: context.auth.uid,
    userEmail: context.auth.token.email || 'unknown',
    action: 'DELETE',
    resource: { type: 'ficha', id: fichaId, path: `/fichas/${fichaId}` },
    metadata: { 
      deletedData: fichaData,
      reason: data.reason || 'User requested deletion'
    },
    result: 'SUCCESS'
  });
  
  return { success: true, message: 'Ficha deleted successfully' };
});
```

**Responsabilidades**:
- Registrar todas las operaciones sensibles
- Capturar contexto completo (usuario, tenant, timestamp, metadata)
- Almacenar en Firestore y Cloud Logging
- Proporcionar API de consulta para admins
- Soportar análisis forense y compliance

### 7. Validación de Esquemas

**Propósito**: Validar estructura de datos antes de escrituras en Firestore

**Schemas con Zod**:

```typescript
// src/schemas/ficha.schema.ts
import { z } from 'zod';

export const FichaSchema = z.object({
  // Campos obligatorios
  pozo: z.string().min(1, 'Pozo es requerido').max(50),
  municipio: z.string().min(1, 'Municipio es requerido').max(100),
  barrio: z.string().min(1, 'Barrio es requerido').max(100),
  
  // Campos de seguridad
  tenantId: z.string().uuid('Tenant ID inválido'),
  createdBy: z.string().min(1, 'Created by es requerido'),
  createdAt: z.string().datetime('Fecha inválida'),
  updatedBy: z.string().optional(),
  updatedAt: z.string().datetime('Fecha inválida').optional(),
  
  // Control de acceso
  visibility: z.enum(['private', 'tenant', 'public']).default('tenant'),
  sharedWith: z.array(z.string()).default([]),
  
  // Campos opcionales del dominio
  direccion: z.string().max(200).optional(),
  obs: z.string().max(5000).optional(),
  gps: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    timestamp: z.string().datetime().optional()
  }).optional(),
  
  // Listas relacionadas
  fotoList: z.array(z.object({
    filename: z.string(),
    blobId: z.string().optional(),
    driveId: z.string().optional(),
    timestamp: z.string().datetime(),
    gps: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  })).default([]),
  
  tuberiaList: z.array(z.string()).default([])
});

export type FichaData = z.infer<typeof FichaSchema>;

export const validateFicha = (data: unknown): FichaData => {
  return FichaSchema.parse(data);
};

export const validateFichaPartial = (data: unknown): Partial<FichaData> => {
  return FichaSchema.partial().parse(data);
};
```

**Uso en Cloud Functions**:
