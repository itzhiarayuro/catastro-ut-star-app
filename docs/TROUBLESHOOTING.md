# Guía de Resolución de Problemas - UT STAR

## 🚨 Problemas Críticos

### 1. Pérdida Total de Datos en Dispositivo

**Escenario:** El celular se perdió, robó o dañó antes de sincronizar.

#### Datos de Texto (Fichas)

**Estado:** ❌ **PÉRDIDA IRRECUPERABLE**

**Razón:** Los datos solo existen en LocalStorage del dispositivo.

**Prevención:**
- Sincronizar al final de cada jornada
- Implementar sincronización silenciosa de borradores (roadmap)

#### Fotos

**Estado:** ✅ **RECUPERABLE**

**Procedimiento:**
1. Localizar la tarjeta SD de la cámara GoPro
2. Conectar la SD a una PC
3. Abrir `https://tu-dominio.web.app/pc_sync.html`
4. Seleccionar municipio e ingresar ID del pozo
5. Arrastrar todas las fotos de la SD
6. Presionar "Sincronizar con Google Drive"

**Protocolo Obligatorio:**
- Descarga diaria de SD en oficina
- Verificación de copia antes de formatear la SD

---

### 2. Error "No puedo sincronizar"

#### Diagnóstico

**Síntomas:**
- Botón de sincronización no responde
- Mensaje "Error de red"
- Spinner infinito

**Causas Posibles:**

| Causa | Cómo Verificar | Solución |
|-------|----------------|----------|
| Sin conexión WiFi | Verificar icono WiFi en pantalla | Conectar a red WiFi estable |
| Token expirado | Han pasado >1 hora sin conexión | Cerrar y reabrir app |
| Endpoint GAS caído | Otras apps funcionan bien | Contactar a soporte técnico |
| Cuota Drive excedida | Error persiste en múltiples dispositivos | Revisar cuotas de Google Drive |

#### Solución Paso a Paso

1. **Verificar conectividad:**
   ```
   - Abrir navegador
   - Ir a google.com
   - Si no carga → problema de red
   ```

2. **Refrescar sesión:**
   ```
   - Cerrar completamente la app
   - Esperar 10 segundos
   - Reabrir la app
   - Intentar sincronizar nuevamente
   ```

3. **Verificar espacio en dispositivo:**
   ```
   - Ir a Configuración del celular
   - Almacenamiento
   - Verificar que haya >500MB libres
   ```

4. **Si persiste:**
   - Contactar a soporte
   - Proporcionar: nombre del inspector, municipio, hora del error

---

### 3. "Las fotos no se guardan"

#### Diagnóstico

**Síntomas:**
- Al tomar foto, no aparece en la lista
- Mensaje "Error al guardar foto"
- App se congela al capturar

**Causas Posibles:**

| Causa | Cómo Verificar | Solución |
|-------|----------------|----------|
| Espacio insuficiente | Configuración → Almacenamiento | Liberar espacio (>1GB recomendado) |
| Cola saturada | >80 fotos pendientes | Sincronizar fotos pendientes |
| Permisos de cámara | Primera vez usando cámara | Otorgar permisos de cámara |
| IndexedDB corrupto | Error persiste después de liberar espacio | Limpiar caché de la app |

#### Solución Paso a Paso

1. **Verificar espacio disponible:**
   ```
   - Configuración → Almacenamiento
   - Si <500MB → Eliminar archivos innecesarios
   - Sincronizar fotos pendientes para liberar IndexedDB
   ```

2. **Verificar permisos:**
   ```
   - Configuración del celular
   - Aplicaciones → Chrome/Navegador
   - Permisos → Cámara → Permitir
   ```

3. **Limpiar caché (último recurso):**
   ```
   ⚠️ ADVERTENCIA: Esto eliminará borradores no sincronizados
   
   - Configuración del celular
   - Aplicaciones → Chrome/Navegador
   - Almacenamiento → Borrar datos
   - Reabrir la app
   - Usar "Restaurar desde nube"
   ```

---

### 4. "No puedo capturar GPS"

#### Diagnóstico

**Síntomas:**
- Botón GPS no responde
- Coordenadas aparecen como "null"
- Mensaje "GPS no soportado"

**Causas Posibles:**

| Causa | Cómo Verificar | Solución |
|-------|----------------|----------|
| Permisos denegados | Primera vez usando GPS | Otorgar permisos de ubicación |
| GPS desactivado | Configuración rápida del celular | Activar GPS/Ubicación |
| Señal débil | Dentro de edificio | Salir al exterior |
| Modo avión activo | Icono de avión visible | Desactivar modo avión |

#### Solución Paso a Paso

1. **Verificar permisos:**
   ```
   - Configuración del celular
   - Aplicaciones → Chrome/Navegador
   - Permisos → Ubicación → Permitir
   - Seleccionar "Permitir siempre" o "Solo mientras se usa"
   ```

2. **Activar GPS:**
   ```
   - Deslizar desde arriba (configuración rápida)
   - Activar "Ubicación" o "GPS"
   - Verificar que no esté en modo "Solo WiFi"
   ```

3. **Mejorar señal:**
   ```
   - Salir al exterior
   - Esperar 30-60 segundos para adquisición de satélites
   - Intentar capturar GPS nuevamente
   ```

4. **Usar coordenadas simuladas (desarrollo):**
   ```
   ⚠️ Solo para pruebas, NO para producción
   - El sistema genera coordenadas de Sopó automáticamente
   - Reemplazar manualmente después con GPS real
   ```

---

### 5. "Campo bloqueado / No puedo editar"

#### Diagnóstico

**Síntomas:**
- Campo aparece deshabilitado (gris)
- No se puede hacer clic en el campo
- Mensaje "Campo bloqueado por reglas"

**Causa:** Motor de Reglas Automáticas

#### Reglas Activas

| Estado del Pozo | Campos Bloqueados | Razón |
|----------------|-------------------|-------|
| OCULTO | Todos los componentes → DESCONOCIDO | No se puede inspeccionar interior |
| SELLADO | Sistema, Tipo Cámara → DESCONOCIDO | Pozo inaccesible |
| COLMATADO | Cañuela → DESCONOCIDO | Cañuela no visible |
| INUNDADO | Tapa NO puede ser DESCONOCIDO | Debe existir tapa para inundarse |
| Sistema DESCONOCIDO | Tipo Cámara, Cañuela → DESCONOCIDO | Sin info del sistema |
| Rasante DESCONOCIDO | Tapa → DESCONOCIDO | Sin contexto de superficie |

#### Solución

**Opción 1: Verificar Estado del Pozo (Recomendado)**
```
1. Revisar el campo "Estado del Pozo"
2. Si está en OCULTO/SELLADO/COLMATADO por error, cambiarlo
3. Los campos se desbloquearán automáticamente
```

**Opción 2: Modo Contingencia (Requiere Autorización)**
```
1. Contactar a soporte
2. Explicar por qué necesitas override
3. Soporte activará "Modo Contingencia"
4. Podrás editar el campo
5. Se dejará traza de auditoría:
   - Quién hizo el override
   - Cuándo
   - Por qué
6. La ficha se marcará para revisión obligatoria en oficina
```

---

### 6. "La ficha desapareció"

#### Diagnóstico

**Síntomas:**
- Ficha que estaba en "Historial" ya no aparece
- Borrador desapareció al reabrir la app
- Lista de fichas está vacía

**Causas Posibles:**

| Causa | Cómo Verificar | Solución |
|-------|----------------|----------|
| LocalStorage limpiado | Otras apps también perdieron datos | Restaurar desde nube |
| Navegador cambió | Abriste en otro navegador | Usar siempre el mismo navegador |
| Ficha nunca se guardó | No presionaste "Guardar" | Pérdida irrecuperable |
| Eliminación accidental | Alguien presionó "Eliminar" | Contactar administrador |

#### Solución Paso a Paso

**Si la ficha estaba sincronizada:**
```
1. Ir a Configuración
2. Presionar "Restaurar desde nube"
3. El sistema descargará todas las fichas sincronizadas
4. Verificar que la ficha aparezca en "Historial"
```

**Si la ficha NO estaba sincronizada:**
```
❌ PÉRDIDA IRRECUPERABLE

Prevención:
- Guardar frecuentemente (auto-save cada 1.5s)
- Sincronizar al final del día
- No limpiar caché del navegador sin sincronizar primero
```

---

### 7. Sincronización Nocturna Interrumpida

#### Diagnóstico

**Síntomas:**
- Sincronización se detuvo a mitad de proceso
- Pantalla se apagó durante sincronización
- Error de red durante subida

**Comportamiento del Sistema:**

| Componente | Comportamiento | Acción Requerida |
|-----------|----------------|------------------|
| Fichas (Firestore) | ✅ Encola automáticamente | Ninguna - se reintenta solo |
| Fotos (Drive) | ✅ Subida idempotente | Ninguna - continúa desde donde quedó |

#### Solución

**No es necesario empezar de cero.**

```
1. Verificar conexión WiFi
2. Conectar cargador
3. Reabrir pantalla de sincronización
4. Presionar "Comenzar Ahora" nuevamente
5. El sistema continuará desde la última foto exitosa
```

**Prevención:**
- Conectar cargador ANTES de iniciar
- Usar WiFi estable (no datos móviles)
- No bloquear la pantalla durante el proceso
- Sincronizar en horarios de baja actividad (noche)

---

### 8. Error "Conflicto de Versión"

#### Diagnóstico

**Síntomas:**
- Mensaje "Conflicto de versión detectado"
- Sincronización se detiene
- Opciones: Conservar nube / Sobrescribir / Guardar copia

**Causa:** Dos inspectores editaron la misma ficha offline

#### Solución

**Opciones Disponibles:**

1. **Conservar versión de la nube (Recomendado si no estás seguro)**
   ```
   - Descarta tus cambios locales
   - Mantiene la versión que está en Firestore
   - Tus cambios se perderán
   ```

2. **Sobrescribir con mis datos (Solo si estás seguro)**
   ```
   - Reemplaza la versión de la nube con tus datos
   - Los cambios del otro inspector se perderán
   - Usar solo si coordinaste con el otro inspector
   ```

3. **Guardar como copia local (Para revisar después)**
   ```
   - Guarda tus cambios como borrador separado
   - No afecta la versión de la nube
   - Puedes revisar y decidir después
   ```

**Prevención:**
- Política operativa: 1 ficha = 1 inspector propietario
- Coordinar con el equipo antes de editar fichas de otros
- Sincronizar frecuentemente para detectar conflictos temprano

---

## 🔧 Problemas Técnicos Avanzados

### Limpiar Caché Completo (Último Recurso)

⚠️ **ADVERTENCIA:** Esto eliminará TODOS los borradores no sincronizados.

**Cuándo usar:**
- IndexedDB corrupto
- Errores persistentes después de intentar todo lo demás
- App completamente inutilizable

**Procedimiento:**

```
1. ANTES DE CONTINUAR:
   - Verificar que todas las fichas importantes estén sincronizadas
   - Anotar el ID de cualquier borrador importante
   - Descargar fotos de la SD de la cámara

2. Limpiar caché:
   - Configuración del celular
   - Aplicaciones → Chrome (o navegador usado)
   - Almacenamiento → Borrar datos
   - Confirmar

3. Reabrir la app:
   - Iniciar sesión nuevamente
   - Ir a Configuración
   - Presionar "Restaurar desde nube"

4. Verificar:
   - Fichas sincronizadas deben aparecer
   - Borradores no sincronizados se habrán perdido
```

---

### Verificar Estado de Servicios Externos

#### Google Apps Script (Drive Sync)

**Síntomas de fallo:**
- Todas las sincronizaciones de fotos fallan
- Error persiste en múltiples dispositivos
- Fichas se sincronizan pero fotos no

**Verificación:**
```
1. Contactar a soporte técnico
2. Soporte verificará:
   - Estado del endpoint GAS
   - Cuotas de Google Drive
   - Logs de errores en GAS
```

#### Firebase Services

**Síntomas de fallo:**
- No se puede iniciar sesión
- Firestore no responde
- Errores de autenticación

**Verificación:**
```
1. Verificar Firebase Status: https://status.firebase.google.com
2. Si hay incidentes reportados → Esperar resolución
3. Si no hay incidentes → Contactar a soporte
```

---

## 📞 Contacto de Soporte

**Protocolo de Escalamiento:**

1. **Nivel 1:** Consultar esta documentación
2. **Nivel 2:** Contactar a soporte interno
3. **Nivel 3:** Escalamiento a desarrollo

**Información a Proporcionar:**
- Nombre del inspector
- Municipio
- Descripción del problema
- Hora aproximada del error
- Pasos para reproducir
- Capturas de pantalla (si es posible)

---

## 📋 Checklist de Diagnóstico Rápido

Antes de contactar a soporte, verificar:

- [ ] ¿Hay conexión a internet? (Abrir google.com)
- [ ] ¿Hay espacio en el dispositivo? (>500MB)
- [ ] ¿Los permisos están otorgados? (Cámara, Ubicación)
- [ ] ¿Intentaste cerrar y reabrir la app?
- [ ] ¿La ficha estaba guardada antes del problema?
- [ ] ¿Hay fotos en la SD de la cámara como respaldo?
- [ ] ¿Otros inspectores tienen el mismo problema?

---

**Última actualización:** 2025  
**Versión:** 1.0.0
