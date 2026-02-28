# Guía de Usuario - UT STAR

## 📱 Introducción

Esta guía está diseñada para inspectores de campo que utilizan la aplicación UT STAR para el catastro de alcantarillado.

---

## 🚀 Primeros Pasos

### Acceso a la Aplicación

1. **Abrir la aplicación** en tu navegador móvil
2. **Iniciar sesión** con tu correo y contraseña
3. La aplicación se cargará en la pantalla principal

### Instalación como PWA (Recomendado)

**Android (Chrome):**
1. Abrir la app en Chrome
2. Presionar el menú (⋮)
3. Seleccionar "Agregar a pantalla de inicio"
4. Confirmar

**iOS (Safari):**
1. Abrir la app en Safari
2. Presionar el botón de compartir
3. Seleccionar "Agregar a pantalla de inicio"
4. Confirmar

---

## 📋 Flujo de Trabajo Diario

### 1. Inicio del Día

```
✓ Verificar que el dispositivo esté cargado
✓ Verificar espacio disponible (>1GB recomendado)
✓ Abrir la aplicación
✓ Verificar que aparezca tu borrador si lo dejaste pendiente
```

### 2. Durante la Inspección

#### Crear Nueva Ficha

1. Desde la pantalla principal, presionar **"Nueva Inspección"**
2. El sistema genera un ID único automáticamente
3. Comenzar a llenar los datos

#### Paso 1: Información General

**Campos obligatorios:**
- **Número de Pozo**: Identificador único del pozo
- **Municipio**: Sopó, Sibaté o Granada
- **Barrio**: Nombre del barrio
- **Dirección**: Ubicación exacta
- **Sistema**: PLUVIAL, RESIDUAL, COMBINADO, OCULTO, DESCONOCIDO
- **Estado del Pozo**: Sin represamiento, Inundado, Sellado, Colmatado, Oculto
- **GPS**: Presionar botón "Capturar GPS"

**Captura de GPS:**
```
1. Presionar botón "Capturar GPS"
2. Otorgar permisos si es la primera vez
3. Esperar 5-10 segundos
4. Verificar que aparezcan las coordenadas
```

**Consejos:**
- Capturar GPS al aire libre para mejor precisión
- Si falla, salir del edificio e intentar nuevamente
- La precisión debe ser <10 metros idealmente

#### Paso 2: Geometría del Pozo

**Campos obligatorios:**
- **Tipo de Cámara**: Seleccionar del listado
- **Tipo de Rasante**: Seleccionar del listado
- **Diámetro**: En metros (ej: 0.9)
- **Altura**: En metros (ej: 2.0)

**Componentes del Pozo:**

Para cada componente (Tapa, Cuerpo, Cono, Cañuela, Peldaños):
1. Seleccionar si existe: SÍ / NO / DESCONOCIDO
2. Si existe, llenar:
   - Material
   - Estado
   - Otros campos específicos

**⚠️ Campos Bloqueados:**

Si ves campos deshabilitados (grises), es porque el **Motor de Reglas** los bloqueó automáticamente según el estado del pozo:

| Estado del Pozo | Campos Bloqueados |
|----------------|-------------------|
| OCULTO | Todos los componentes |
| SELLADO | Sistema, Tipo Cámara |
| COLMATADO | Cañuela |

**Solución:** Verificar que el estado del pozo sea correcto. Si necesitas override, contactar a soporte.

#### Paso 3: Tuberías y Sumideros

**Agregar Tubería:**
1. Presionar botón "+"
2. Seleccionar tipo: ENTRADA / SALIDA
3. Llenar todos los campos obligatorios
4. Guardar

**Agregar Sumidero:**
1. Presionar botón "+"
2. Llenar todos los campos obligatorios
3. Guardar

**Eliminar:**
- Presionar el ícono de papelera en la tubería/sumidero

#### Paso 4: Registro Fotográfico

**Categorías de fotos:**
1. **General**: Vista general del pozo
2. **Interior**: Interior de la cámara
3. **Daños**: Evidencia de daños
4. **Esquema Vertical**: Diagrama de tuberías
5. **Ubicación General**: Contexto urbano

**Capturar foto:**
```
1. Seleccionar categoría
2. Presionar botón de cámara
3. Tomar foto
4. Verificar que aparezca en la lista
```

**Consejos:**
- Tomar fotos con buena iluminación
- Verificar que la foto sea clara antes de continuar
- Las fotos se nombran automáticamente

**⚠️ Si las fotos no se guardan:**
- Verificar espacio disponible
- Sincronizar fotos pendientes
- Ver [Troubleshooting](TROUBLESHOOTING.md#3-las-fotos-no-se-guardan)

#### Paso 5: Observaciones y Firmas

- **Observaciones**: Cualquier nota adicional
- **Inspector**: Tu nombre (elaboró)
- **Revisor**: Nombre del revisor
- **Aprobador**: Nombre del aprobador

### 3. Guardar la Ficha

**Opciones:**

1. **Auto-save (Automático)**
   - La app guarda automáticamente cada 1.5 segundos
   - Aparece mensaje "✓ Borrador guardado"

2. **Guardar Manual**
   - Presionar botón "Guardar"
   - Si está completa → Se guarda en "Historial"
   - Si está incompleta → Se guarda como borrador

**Validación:**

La app verifica que estén llenos:
- Todos los campos obligatorios del Paso 1
- Todos los campos obligatorios del Paso 2
- Tuberías completas (si hay)
- Sumideros completos (si hay)

Si falta algo, aparece mensaje: "📁 Guardado como Borrador. Pendiente: [campo]..."

### 4. Final del Día

```
✓ Verificar que todas las fichas estén guardadas
✓ Conectar a WiFi
✓ Conectar el cargador
✓ Iniciar "Sincronización Nocturna"
✓ Descargar fotos de la SD de la cámara (protocolo obligatorio)
```

---

## 🔄 Sincronización

### Sincronización Nocturna (Recomendada)

**Cuándo usar:**
- Al final del día
- Cuando tengas WiFi estable
- Cuando el dispositivo esté conectado al cargador

**Proceso:**

```
1. Pantalla principal → "Sincronización Nocturna"
2. Verificar resumen:
   - Fichas listas para subir
   - Fichas incompletas
   - Fotos pendientes
3. Presionar "Comenzar Ahora"
4. NO bloquear la pantalla
5. Esperar a que termine (puede tardar varios minutos)
6. Verificar mensaje "¡Sincronización Exitosa!"
```

**⚠️ Importante:**
- Mantener la pantalla encendida
- No cerrar la app durante el proceso
- Usar WiFi (no datos móviles)
- Tener el cargador conectado

**Si se interrumpe:**
- No hay problema, el proceso es reanudable
- Simplemente volver a iniciar la sincronización
- Continuará desde donde quedó

---

## 🗺️ Visualización en Mapa

### Ver Fichas en el Mapa

1. Pantalla principal → Botón de mapa
2. El mapa muestra todos los pozos georeferenciados en tiempo real
3. Los colores de los marcadores indican el tipo de sistema:
   - 🔵 Azul: PLUVIAL
   - ⚫ Gris: RESIDUAL
   - 🟣 Morado: COMBINADO
   - 🟠 Ámbar: OCULTO
   - 🔴 Rojo: DESCONOCIDO

### Ubicación en Tiempo Real

**Punto Azul Pulsante:**
- Representa tu ubicación actual
- Se actualiza automáticamente
- Tiene un efecto de pulso para fácil identificación

**Centrar en tu Ubicación:**
1. Presionar el botón flotante azul con ícono de navegación (esquina derecha)
2. Otorgar permisos de ubicación si es la primera vez
3. El mapa se centrará en tu posición actual con zoom 18
4. El botón se anima mientras busca tu ubicación

**Consejos:**
- El GPS funciona mejor al aire libre
- La primera vez puede tardar 5-10 segundos
- El punto azul se actualiza automáticamente mientras te mueves

### Cambiar Tipo de Mapa

**Opciones disponibles:**
- **Híbrido** (default): Satélite + nombres de calles
- **Roadmap**: Vista de calles tradicional

**Cambiar:**
1. Presionar botón de capas (esquina superior derecha)
2. Alterna entre híbrido y roadmap

### Ver Detalles de un Pozo

1. Hacer clic en un marcador (pin de color)
2. Aparece ventana emergente con:
   - Número de pozo
   - Municipio
   - Sistema
   - Dirección
   - Coordenadas GPS
3. Presionar botón "EDITAR" para abrir la ficha completa

### Estadísticas en el Mapa

**Panel inferior:**
- Muestra conteo en tiempo real por tipo de sistema
- Se actualiza automáticamente al agregar/editar fichas
- Se oculta cuando hay una ventana de información abierta

---

## 📊 Historial de Fichas

### Ver Fichas Guardadas

1. Pantalla principal → "Historial de Fichas"
2. Lista de todas las fichas guardadas
3. Ordenadas por fecha (más recientes primero)

### Editar Ficha

1. Hacer clic en la ficha
2. Se abre el formulario
3. Hacer cambios
4. Guardar nuevamente

### Eliminar Ficha

**⚠️ Precaución:** Esta acción es permanente.

```
1. Hacer clic en el ícono de papelera
2. Escribir "ELIMINAR" (en mayúsculas)
3. Confirmar
```

**Protecciones:**
- No se puede eliminar ficha no sincronizada sin conexión
- Confirmación obligatoria
- Las fichas sincronizadas se marcan como eliminadas (soft delete)

---

## 🔧 Configuración

### Cambiar Municipio

1. Ir a Configuración
2. Seleccionar municipio
3. Guardar

### Restaurar desde Nube

**Cuándo usar:**
- Si perdiste tus fichas locales
- Si limpiaste el caché por error
- Si cambiaste de dispositivo

**Proceso:**
```
1. Ir a Configuración
2. Presionar "Restaurar desde nube"
3. Esperar a que descargue
4. Verificar que aparezcan las fichas
```

**⚠️ Nota:** Solo recupera fichas que estaban sincronizadas.

---

## 💡 Consejos y Mejores Prácticas

### Captura de Datos

✅ **Hacer:**
- Llenar todos los campos obligatorios
- Capturar GPS al aire libre
- Tomar fotos claras y bien iluminadas
- Guardar frecuentemente
- Sincronizar al final del día

❌ **Evitar:**
- Dejar campos obligatorios vacíos
- Usar "DESCONOCIDO" sin necesidad
- Tomar fotos borrosas
- Acumular muchas fichas sin sincronizar
- Limpiar caché sin sincronizar primero

### Gestión de Espacio

**Verificar espacio disponible:**
```
Configuración del celular → Almacenamiento
```

**Liberar espacio:**
- Sincronizar fotos pendientes
- Eliminar archivos innecesarios
- Desinstalar apps no usadas

**Recomendación:** Mantener siempre >1GB libre

### Batería

**Consejos:**
- Cargar el dispositivo durante la noche
- Llevar batería externa en campo
- Activar modo ahorro de energía si es necesario
- Sincronizar con el cargador conectado

---

## 🆘 Problemas Comunes

### "No puedo capturar GPS"

**Solución rápida:**
```
1. Verificar permisos de ubicación
2. Activar GPS en configuración rápida
3. Salir al exterior
4. Esperar 30-60 segundos
5. Intentar nuevamente
```

### "Las fotos no se guardan"

**Solución rápida:**
```
1. Verificar espacio disponible (>500MB)
2. Sincronizar fotos pendientes
3. Otorgar permisos de cámara
```

### "No puedo sincronizar"

**Solución rápida:**
```
1. Verificar conexión WiFi
2. Cerrar y reabrir la app
3. Verificar espacio disponible
4. Intentar nuevamente
```

### "Campo bloqueado"

**Solución rápida:**
```
1. Verificar estado del pozo
2. Si es correcto, contactar a soporte
3. Soporte activará modo contingencia si es necesario
```

**Ver guía completa:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📞 Soporte

### Protocolo de Escalamiento

1. **Nivel 1:** Consultar esta guía
2. **Nivel 2:** Consultar [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. **Nivel 3:** Contactar a soporte interno
4. **Nivel 4:** Escalamiento a desarrollo

### Información a Proporcionar

Cuando contactes a soporte, ten lista esta información:
- Tu nombre
- Municipio
- Descripción del problema
- Hora aproximada del error
- Capturas de pantalla (si es posible)

---

## 📋 Checklist Diario

### Inicio del Día
- [ ] Dispositivo cargado (>50%)
- [ ] Espacio disponible (>1GB)
- [ ] App abierta y funcionando
- [ ] Borrador restaurado (si aplica)

### Durante el Día
- [ ] Capturar GPS en cada pozo
- [ ] Llenar todos los campos obligatorios
- [ ] Tomar fotos de todas las categorías
- [ ] Guardar cada ficha al terminar

### Final del Día
- [ ] Todas las fichas guardadas
- [ ] Conectado a WiFi
- [ ] Cargador conectado
- [ ] Sincronización nocturna completada
- [ ] Fotos de SD descargadas a PC

---

**Última actualización:** 2025  
**Versión:** 1.0.0
