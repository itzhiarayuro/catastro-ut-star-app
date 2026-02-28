# Guía de Contribución - UT STAR

¡Gracias por tu interés en contribuir al proyecto UT STAR!

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta profesional. Al participar, se espera que mantengas este código.

### Nuestros Estándares

✅ **Comportamiento Aceptable:**
- Ser respetuoso con otros contribuyentes
- Aceptar críticas constructivas
- Enfocarse en lo mejor para el proyecto
- Mostrar empatía hacia otros miembros

❌ **Comportamiento Inaceptable:**
- Lenguaje ofensivo o discriminatorio
- Ataques personales
- Acoso público o privado
- Publicar información privada de otros

---

## 🤝 Cómo Contribuir

### Tipos de Contribuciones

Aceptamos varios tipos de contribuciones:

1. **Código**
   - Nuevas funcionalidades
   - Corrección de bugs
   - Mejoras de rendimiento
   - Refactorización

2. **Documentación**
   - Corrección de errores
   - Mejoras de claridad
   - Nuevos ejemplos
   - Traducciones

3. **Testing**
   - Nuevos tests
   - Mejora de cobertura
   - Tests de integración
   - Tests E2E

4. **Diseño**
   - Mejoras de UI/UX
   - Accesibilidad
   - Responsive design

---

## 🛠️ Configuración del Entorno

### Requisitos Previos

- Node.js 18+
- npm 9+
- Git
- Editor de código (recomendado: VS Code)

### Instalación

```bash
# 1. Fork el repositorio en GitHub

# 2. Clonar tu fork
git clone https://github.com/TU_USUARIO/catastro-ut-star.git
cd catastro-ut-star

# 3. Agregar upstream
git remote add upstream https://github.com/REPO_ORIGINAL/catastro-ut-star.git

# 4. Instalar dependencias
npm install

# 5. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de desarrollo

# 6. Iniciar servidor de desarrollo
npm run dev
```

### Extensiones Recomendadas (VS Code)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 🔄 Proceso de Desarrollo

### 1. Crear una Rama

```bash
# Actualizar main
git checkout main
git pull upstream main

# Crear rama para tu feature/fix
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/nombre-del-bug
```

**Convención de nombres de ramas:**
- `feature/` - Nueva funcionalidad
- `fix/` - Corrección de bug
- `docs/` - Cambios en documentación
- `refactor/` - Refactorización de código
- `test/` - Agregar o modificar tests

### 2. Hacer Cambios

```bash
# Hacer tus cambios
# ...

# Verificar que el código compile
npm run build

# Ejecutar linter
npm run lint

# Ejecutar tests (cuando estén implementados)
npm test
```

### 3. Commit

**Convención de commits:**

```
tipo(alcance): descripción corta

Descripción más detallada si es necesario.

Fixes #123
```

**Tipos de commit:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan el código)
- `refactor`: Refactorización
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**

```bash
git commit -m "feat(sync): agregar reintentos automáticos en sincronización"
git commit -m "fix(gps): corregir captura de GPS en Android 13"
git commit -m "docs(readme): actualizar instrucciones de instalación"
```

### 4. Push

```bash
git push origin feature/nombre-descriptivo
```

---

## 📏 Estándares de Código

### TypeScript

```typescript
// ✅ Bueno
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): User | null {
  // ...
}

// ❌ Malo
function getUserById(id) {
  // Sin tipos
}
```

### React

```typescript
// ✅ Bueno
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<string>('');
  
  useEffect(() => {
    // Cleanup
    return () => {
      // ...
    };
  }, [dependencies]);
  
  return <div>{/* ... */}</div>;
};

// ❌ Malo
function MyComponent(props) {
  // Sin tipos, sin cleanup
}
```

### Naming Conventions

```typescript
// Variables y funciones: camelCase
const userName = 'John';
function getUserName() {}

// Componentes: PascalCase
const UserProfile = () => {};

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// Interfaces: PascalCase con prefijo I (opcional)
interface IUserData {}
// o
interface UserData {}

// Types: PascalCase
type UserRole = 'admin' | 'inspector';
```

### Comentarios

```typescript
// ✅ Bueno: Comentarios útiles
/**
 * Sincroniza fichas pendientes a Firestore
 * @param fichas - Diccionario de fichas a sincronizar
 * @returns Fichas actualizadas con estado de sincronización
 */
export const syncFichasToFirestore = async (
  fichas: Record<string, any>
): Promise<Record<string, any>> => {
  // ...
};

// ❌ Malo: Comentarios obvios
// Incrementa el contador
counter++;
```

### Manejo de Errores

```typescript
// ✅ Bueno
try {
  await syncData();
} catch (error) {
  console.error('Error syncing data:', error);
  toast('Error al sincronizar. Intenta nuevamente.');
  // Manejar el error apropiadamente
}

// ❌ Malo
try {
  await syncData();
} catch (error) {
  // Ignorar el error
}
```

---

## 🔍 Proceso de Pull Request

### 1. Crear Pull Request

1. Ve a tu fork en GitHub
2. Haz clic en "Pull Request"
3. Selecciona tu rama
4. Llena el template de PR

### 2. Template de Pull Request

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas que realizaste.

## Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código en áreas difíciles de entender
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He agregado tests que prueban mi fix/feature
- [ ] Los tests nuevos y existentes pasan localmente

## Screenshots (si aplica)
Agrega screenshots si hay cambios visuales.

## Issues Relacionados
Fixes #123
```

### 3. Revisión de Código

Tu PR será revisado por al menos un mantenedor. Pueden:
- Aprobar el PR
- Solicitar cambios
- Hacer comentarios

**Responde a los comentarios:**
- Haz los cambios solicitados
- Responde a las preguntas
- Marca las conversaciones como resueltas

### 4. Merge

Una vez aprobado, un mantenedor hará merge de tu PR.

---

## 🐛 Reportar Bugs

### Antes de Reportar

1. Verifica que no sea un problema de configuración
2. Busca en issues existentes
3. Intenta reproducir el bug

### Template de Bug Report

```markdown
## Descripción del Bug
Descripción clara y concisa del bug.

## Pasos para Reproducir
1. Ir a '...'
2. Hacer clic en '...'
3. Scroll hasta '...'
4. Ver error

## Comportamiento Esperado
Descripción de lo que esperabas que sucediera.

## Comportamiento Actual
Descripción de lo que realmente sucede.

## Screenshots
Si aplica, agrega screenshots.

## Entorno
- OS: [ej. Windows 11]
- Navegador: [ej. Chrome 120]
- Versión de la App: [ej. 1.0.0]

## Información Adicional
Cualquier otra información relevante.
```

---

## 💡 Sugerir Mejoras

### Template de Feature Request

```markdown
## Descripción de la Funcionalidad
Descripción clara y concisa de la funcionalidad.

## Problema que Resuelve
¿Qué problema resuelve esta funcionalidad?

## Solución Propuesta
Descripción de cómo funcionaría.

## Alternativas Consideradas
Otras soluciones que consideraste.

## Información Adicional
Cualquier otra información relevante.
```

---

## 📚 Recursos

### Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Guía de Usuario](docs/USER_GUIDE.md)
- [API Reference](docs/API.md)

### Tecnologías

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Firebase](https://firebase.google.com/docs)
- [Vite](https://vitejs.dev/)

---

## 🙏 Agradecimientos

¡Gracias por contribuir a UT STAR! Tu ayuda es muy apreciada.

---

**Última actualización:** 2025  
**Versión:** 1.0.0
