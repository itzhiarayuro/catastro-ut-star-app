# Changelog - UT STAR

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] - 2025-02-28

### 📚 Documentación

#### Agregado
- Documentación completa del proyecto organizada en carpeta `docs/`
- `README.md` principal con visión general del proyecto
- `docs/README.md` como índice de toda la documentación
- `docs/USER_GUIDE.md` - Guía completa para inspectores de campo
- `docs/TROUBLESHOOTING.md` - Soluciones a problemas comunes
- `docs/ARCHITECTURE.md` - Arquitectura técnica detallada
- `docs/DEPLOYMENT.md` - Guía de despliegue paso a paso
- `docs/SECURITY.md` - Medidas de seguridad y mejores prácticas
- `CONTRIBUTING.md` - Guía para contribuir al proyecto
- `CHANGELOG.md` - Este archivo

#### Estructura de Documentación
```
docs/
├── README.md                    # Índice de documentación
├── USER_GUIDE.md               # Guía para inspectores
├── TROUBLESHOOTING.md          # Resolución de problemas
├── ARCHITECTURE.md             # Arquitectura técnica
├── DEPLOYMENT.md               # Guía de despliegue
└── SECURITY.md                 # Seguridad
```

### ✨ Características Implementadas

#### Frontend
- ✅ PWA (Progressive Web App) con Service Worker
- ✅ Modo offline completo con LocalStorage + IndexedDB
- ✅ Captura de fotos con almacenamiento local
- ✅ Geolocalización GPS
- ✅ Motor de reglas automáticas
- ✅ Visualización en mapa (Google Maps) con ubicación en tiempo real
- ✅ Exportación a Excel

#### Mapa Interactivo (Actualizado)
- ✅ Sincronización en tiempo real con Firestore (onSnapshot)
- ✅ Ubicación del usuario con punto azul pulsante
- ✅ Botón flotante para centrar en ubicación actual
- ✅ Marcadores personalizados por tipo de sistema
- ✅ InfoWindow con detalles de cada pozo
- ✅ Estadísticas en tiempo real por tipo de sistema
- ✅ Cambio entre vista híbrida y roadmap
- ✅ Soporte para estilos personalizados de Google Maps
- ✅ Evita violación de "User Gesture" (solicita ubicación solo al presionar botón)

#### Backend
- ✅ Firebase Firestore para almacenamiento de fichas
- ✅ Firebase Authentication (Email + Password)
- ✅ Firebase Hosting para despliegue
- ✅ Firebase Functions para sincronización automática
- ✅ Google Apps Script para sincronización de fotos a Drive
- ✅ Estructura jerárquica en Drive (Municipio/Barrio/Pozo)

#### Sincronización
- ✅ Sincronización nocturna con validación de campos
- ✅ Compresión ZIP de fotos (fflate)
- ✅ Batching de 35MB por lote
- ✅ Reintentos automáticos con backoff
- ✅ Subida idempotente (no duplica datos)
- ✅ Historial inmutable en Firestore
- ✅ Actualizaciones en tiempo real en el mapa

#### Seguridad
- ✅ Autenticación requerida para todas las operaciones
- ✅ Reglas de Firestore con deny by default
- ✅ HTTPS/TLS en todos los endpoints
- ✅ Headers de seguridad configurados
- ✅ Variables de entorno para credenciales
- ✅ Service Account con permisos mínimos

### 🔄 Gestión de Datos

#### Backup y Retención
- ✅ Doble escritura: `fichas/` (última versión) + `historial_fichas/` (inmutable)
- ✅ Retención de historial: 3 años (TTL automático)
- ✅ Backup local de emergencia en LocalStorage
- ✅ Fotos permanentes en Google Drive

#### Recuperación ante Desastres
- ✅ Soft delete de fichas (no eliminación física)
- ✅ Función "Restaurar desde nube"
- ✅ Protocolo de descarga diaria de SD de cámara
- ✅ Sincronización reanudable (no pierde progreso)

### 🐛 Problemas Conocidos

#### Limitaciones
- ⚠️ LocalStorage no encriptado (limitación del navegador)
- ⚠️ IndexedDB no encriptado (limitación del navegador)
- ⚠️ Modo `no-cors` en GAS (no se puede leer respuesta)
- ⚠️ Tokens JWT expiran en ~1 hora (requiere conexión para refrescar)

#### Pendientes
- 🚧 Integración con API externa para PDF
- 🚧 Sincronización silenciosa de borradores
- 🚧 Modo Contingencia con traza de auditoría
- 🚧 Dashboard operativo (BigQuery + Looker Studio)
- 🚧 Sistema de alertas proactivas
- 🚧 Monitorización con Sentry
- 🚧 Tests automatizados (Jest + Cypress)

---

## [Unreleased]

### 🚧 En Desarrollo

#### Monitoreo y Alertas
- [ ] Integración con Sentry para captura de errores
- [ ] Dashboard operativo con BigQuery + Looker Studio
- [ ] Alertas proactivas (Cloud Functions + Slack/Email)
- [ ] Métricas de negocio en tiempo real

#### Mejoras de Sincronización
- [ ] Sincronización silenciosa de borradores en segundo plano
- [ ] Compresión de fotos antes de almacenar en IndexedDB
- [ ] Sincronización incremental (solo cambios)
- [ ] Cola de prioridad para sincronización

#### Seguridad
- [ ] Implementar roles (inspector, supervisor, admin)
- [ ] Rotación automática de tokens
- [ ] Auditoría completa de acciones
- [ ] 2FA (Two-Factor Authentication)

#### UX/UI
- [ ] Modo oscuro
- [ ] Accesibilidad (WCAG 2.1 AA)
- [ ] Soporte para tablets
- [ ] Gestos táctiles mejorados

#### Testing
- [ ] Unit tests (Jest + React Testing Library)
- [ ] Integration tests (Cypress)
- [ ] E2E tests (Playwright)
- [ ] Property-based testing (fast-check)

---

## Formato del Changelog

### Tipos de Cambios

- `Agregado` - Para nuevas funcionalidades
- `Cambiado` - Para cambios en funcionalidades existentes
- `Deprecado` - Para funcionalidades que serán removidas
- `Removido` - Para funcionalidades removidas
- `Corregido` - Para corrección de bugs
- `Seguridad` - Para vulnerabilidades de seguridad

### Versionado Semántico

Dado un número de versión MAJOR.MINOR.PATCH:

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nuevas funcionalidades compatibles con versiones anteriores
- **PATCH**: Correcciones de bugs compatibles con versiones anteriores

---

**Última actualización:** 2025-02-28  
**Versión Actual:** 1.0.0
