# UT STAR - Sistema de Catastro de Alcantarillado

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/tu-repo/catastro-ut-star)
[![Firebase](https://img.shields.io/badge/Firebase-10.8.0-orange.svg)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue.svg)](https://www.typescriptlang.org/)

> Aplicación web progresiva (PWA) para la recolección de datos de catastro de alcantarillado en campo, diseñada para funcionar en modo offline con sincronización diferida a la nube.

**Municipios soportados:** Sopó, Sibaté, Granada

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Inicio Rápido](#-inicio-rápido)
- [Arquitectura](#-arquitectura)
- [Documentación](#-documentación)
- [Soporte](#-soporte)
- [Licencia](#-licencia)

---

## ✨ Características Principales

- 🔌 **Modo Offline Completo**: Trabaja sin conexión, sincroniza cuando hay red
- 📸 **Captura de Fotos**: Almacenamiento local con sincronización automática a Google Drive
- 🗺️ **Geolocalización**: Captura automática de coordenadas GPS
- 🔄 **Sincronización Inteligente**: Validación de datos y subida por lotes
- 📊 **Motor de Reglas**: Validación automática según estado del pozo
- 🔐 **Seguridad**: Autenticación Firebase y reglas de acceso estrictas
- 📱 **PWA**: Instalable en dispositivos móviles como app nativa

---

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Firebase configurada
- Google Cloud APIs habilitadas (Maps, Drive)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-repo/catastro-ut-star.git
cd catastro-ut-star

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar en desarrollo
npm run dev
```

### Despliegue

```bash
# Build para producción
npm run build

# Desplegar a Firebase
firebase deploy
```

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│         React 18 + TypeScript + Vite + TailwindCSS          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ALMACENAMIENTO LOCAL (Offline-First)            │
│         LocalStorage (Fichas) + IndexedDB (Fotos)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   SINCRONIZACIÓN NOCTURNA                    │
│      Validación + Compresión + Batching + Reintentos        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND CLOUD                        │
│    Firebase (Firestore + Auth) + Google Drive (GAS)         │
└─────────────────────────────────────────────────────────────┘
```

**Ver documentación completa:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 📚 Documentación

### Para Usuarios

- **[Guía de Usuario](docs/USER_GUIDE.md)** - Cómo usar la aplicación en campo
- **[Resolución de Problemas](docs/TROUBLESHOOTING.md)** - Soluciones a problemas comunes
- **[Preguntas Frecuentes](docs/FAQ.md)** - Respuestas rápidas

### Para Desarrolladores

- **[Arquitectura Técnica](docs/ARCHITECTURE.md)** - Diseño del sistema y componentes
- **[Guía de Desarrollo](docs/DEVELOPMENT.md)** - Configuración del entorno de desarrollo
- **[API Reference](docs/API.md)** - Documentación de funciones y utilidades
- **[Guía de Contribución](docs/CONTRIBUTING.md)** - Cómo contribuir al proyecto

### Para Administradores

- **[Guía de Despliegue](docs/DEPLOYMENT.md)** - Proceso de despliegue y configuración
- **[Monitoreo y Alertas](docs/MONITORING.md)** - Configuración de monitoreo
- **[Backup y Recuperación](docs/BACKUP.md)** - Procedimientos de respaldo

---

## 🔐 Seguridad

⚠️ **IMPORTANTE**: Este repositorio NO contiene información sensible.

- Las credenciales están en `.env.local` (incluido en `.gitignore`)
- Los tokens de API se gestionan mediante variables de entorno
- Las reglas de Firestore requieren autenticación
- El acceso a Google Drive está protegido por Service Account

**Ver más:** [docs/SECURITY.md](docs/SECURITY.md)

---

## 🆘 Soporte

### Problemas Comunes

| Problema | Solución Rápida |
|----------|----------------|
| No puedo capturar GPS | Verificar permisos de ubicación |
| Las fotos no se guardan | Liberar espacio en el dispositivo |
| No puedo sincronizar | Verificar conexión WiFi |
| Campo bloqueado | Revisar estado del pozo |

**Ver guía completa:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

### Contacto

**Protocolo de Escalamiento:**
1. Consultar documentación
2. Contactar a soporte interno
3. Escalamiento a desarrollo

---

## 📊 Estado del Proyecto

### Versión Actual: 1.0.0

**Funcionalidades Implementadas:**
- ✅ Captura de datos offline
- ✅ Sincronización nocturna
- ✅ Motor de reglas automáticas
- ✅ Geolocalización GPS
- ✅ Almacenamiento de fotos en IndexedDB
- ✅ Visualización en mapa
- ✅ Exportación a Excel

**En Desarrollo:**
- 🚧 Integración con API externa para PDF
- 🚧 Sincronización silenciosa de borradores
- 🚧 Modo Contingencia con traza de auditoría
- 🚧 Dashboard operativo (BigQuery + Looker Studio)
- 🚧 Sistema de alertas proactivas
- 🚧 Monitorización con Sentry

**Ver roadmap completo:** [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Icons:** Lucide React
- **Maps:** @vis.gl/react-google-maps

### Backend
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Storage:** Google Drive (via Google Apps Script)
- **Hosting:** Firebase Hosting
- **Functions:** Firebase Cloud Functions

### Almacenamiento Local
- **Fichas:** LocalStorage
- **Fotos:** IndexedDB
- **Persistencia:** Firestore Offline Persistence

### Utilidades
- **Compresión:** fflate
- **EXIF:** exifr
- **Excel:** xlsx
- **PDF:** jspdf + jspdf-autotable

---

## 📝 Convenciones del Proyecto

### Nomenclatura de IDs de Pozo

**Investigación en progreso** - Documentar convención estándar utilizada en campo.

Ejemplos observados:
- Formato con prefijo: `P-XXX`
- Formato alfanumérico: `M076`

### Estados de Ficha

| Estado | Descripción | Ubicación |
|--------|-------------|-----------|
| **Borrador** | Ficha en progreso | LocalStorage |
| **Completa** | Todos los campos llenos | LocalStorage |
| **Sincronizada** | Subida a Firestore | Firestore + LocalStorage |
| **Eliminada** | Soft delete | Firestore (oculta) |

### Categorías de Fotos

1. General
2. Interior
3. Daños
4. Esquema Vertical
5. Ubicación General

---

## 🔄 Gestión de Datos

### Backup y Retención

- **Firestore:** Exportación automática a Cloud Storage (diaria/semanal)
- **Historial:** Retención de 3 años con TTL automático
- **Fotos:** Almacenadas permanentemente en Google Drive
- **Auditoría:** Acceso a versiones históricas desde consola

### Conflictos de Sincronización

**Política:** 1 ficha = 1 inspector propietario mientras esté en estado "EN_CAMPO"

**Resolución:**
- Comparación de `serverVersion` o `timestamp`
- Opciones: Conservar nube / Sobrescribir / Guardar copia
- Prevención mediante asignación de propietarios

**Ver más:** [docs/DATA_MANAGEMENT.md](docs/DATA_MANAGEMENT.md)

---

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests E2E
npm run test:e2e
```

**Estrategia de testing recomendada:**
- Unit tests: Jest + React Testing Library
- Integration tests: Cypress
- E2E tests: Playwright
- Property-based testing: fast-check

---

## 📄 Licencia

**Proyecto:** UT STAR - Sistema de Catastro de Alcantarillado  
**Versión:** 1.0.0  
**Año:** 2025  
**Código:** PDA-C-570-2025

---

## 🙏 Agradecimientos

- Equipo de inspectores de campo por su feedback constante
- UT STAR por el apoyo en el desarrollo
- Comunidad de Firebase y React por las herramientas

---

## 📞 Contacto

Para soporte técnico, consultar el protocolo interno establecido.

---

**⚠️ NOTA DE SEGURIDAD:** Esta documentación NO contiene información sensible. Las credenciales y configuraciones específicas se mantienen en archivos `.env.local` que NO deben ser commiteados al repositorio.
