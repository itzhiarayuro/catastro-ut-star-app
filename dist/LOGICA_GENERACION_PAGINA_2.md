# Lógica de Generación de la Página 2 - Análisis Detallado

## Índice
1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo de Procesamiento](#flujo-de-procesamiento)
4. [Reglas de Negocio](#reglas-de-negocio)
5. [Motor de Layout Inteligente](#motor-de-layout-inteligente)
6. [Casos Especiales](#casos-especiales)
7. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Visión General

La página 2 del PDF es la **página técnica** que muestra información dinámica sobre:
- **Entradas** (tuberías de entrada al pozo)
- **Salidas** (tuberías de salida del pozo)
- **Sumideros** (conexiones de sumideros)

Esta página tiene una complejidad especial porque:
1. El número de elementos varía por pozo (puede haber 1-8 entradas, 0-8 salidas, 0-8 sumideros)
2. Debe reorganizarse dinámicamente según los datos reales
3. Puede omitirse completamente si no hay contenido relevante
4. Usa un layout de 3 columnas con posicionamiento preciso

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                  highFidelityGenerator.ts                    │
│  (Generador principal - orquesta todo el proceso)           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─► checkIfPage2ShouldBeSkipped()
                   │   (Decide si omitir página 2)
                   │
                   ├─► smartLayoutEngine.ts
                   │   (Reorganiza elementos dinámicamente)
                   │
                   └─► highFidelityRenderer.ts
                       (Renderiza elementos en el PDF)
```

### Separación de Responsabilidades

1. **highFidelityGenerator.ts**: Orquestador principal
   - Decide si generar o no la página 2
   - Itera sobre elementos y los renderiza
   - Maneja tracking de fotos usadas

2. **smartLayoutEngine.ts**: Motor de layout inteligente
   - Clasifica elementos técnicos vs decorativos
   - Agrupa elementos por tipo (entrada/salida/sumidero)
   - Reposiciona elementos en layout de 3 columnas
   - **NUNCA toca la página 1** (Muro de Berlín)

3. **highFidelityRenderer.ts**: Renderizador atómico
   - Dibuja celdas de texto
   - Dibuja fotos con bordes y labels
   - Maneja estilos y alineación

---

## Flujo de Procesamiento

### Paso 1: Evaluación de Omisión

```typescript
// En highFidelityGenerator.ts
const shouldSkipPage2 = await checkIfPage2ShouldBeSkipped(design, pozo, blobStore);
```

**Condiciones para OMITIR la página 2:**
```
SI (
  NO hay tuberías (entradas o salidas) Y
  NO hay sumideros Y
  NO hay fotos de entradas/salidas/sumideros
) ENTONCES
  Omitir página 2
```

**Códigos de fotos que indican contenido en página 2:**
```javascript
const page2PhotoCodes = [
    'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7',     // Entradas
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7',     // Salidas
    'SUM1', 'SUM2', 'SUM3', 'SUM4', 'SUM5', 'SUM6', 'SUM7'  // Sumideros
];
```

**Lógica de búsqueda flexible:**
```typescript
const hasPage2Photos = pozo.fotos?.fotos?.some(f => {
    const subcat = String(f.subcategoria || '').toUpperCase();
    const filename = String(f.filename || '').toUpperCase();
    const tipo = String(f.tipo || '').toUpperCase();

    return page2PhotoCodes.some(code =>
        subcat === code ||
        subcat.includes(code) ||
        filename.includes(`-${code}.`) ||
        filename.includes(`-${code}-`) ||
        filename.endsWith(`-${code}`) ||
        tipo === code
    );
});
```

### Paso 2: Aplicación de Smart Layout

```typescript
// Solo si la página 2 NO se omite
const adaptedDesign = applySmartLayout(design, pozo);
```

El motor de layout ejecuta estos pasos:

#### 2.1 Detección del Header Boundary

```typescript
function detectHeaderBoundary(design: FichaDesignVersion): number {
    let maxY = 0;
    
    // Buscar elementos con repeatOnEveryPage
    for (const shape of design.shapes) {
        if (shape.repeatOnEveryPage) {
            const bottom = shape.y + shape.height;
            if (bottom > maxY) maxY = bottom;
        }
    }
    
    for (const placement of design.placements) {
        if (placement.repeatOnEveryPage) {
            const bottom = placement.y + placement.height;
            if (bottom > maxY) maxY = bottom;
        }
    }
    
    return maxY || 49; // Default: 49mm
}
```

**Propósito:** Encontrar dónde termina el header para no sobreponerlo con contenido técnico.

#### 2.2 Separación por Páginas (El Muro de Berlín)

```typescript
const page1Placements = adapted.placements.filter(p => (p.pageNumber || 1) === 1);
const page2Placements = adapted.placements.filter(p => (p.pageNumber || 1) === 2);
const otherPagePlacements = adapted.placements.filter(p => (p.pageNumber || 1) > 2);
```

**Regla de Oro:** La página 1 NUNCA se toca. Es sagrada.

#### 2.3 Clasificación de Elementos de Página 2

```typescript
function classifyPage2Placements(placements: FieldPlacement[]): {
    technicalPlacements: FieldPlacement[];
    otherPlacements: FieldPlacement[];
}
```

**Elementos Técnicos** (se reorganizan):
- Prefijo `ent_*` → Entradas
- Prefijo `sal_*` → Salidas
- Prefijo `sum_*` → Sumideros
- Prefijo `foto_entrada_*` → Fotos de entradas
- Prefijo `foto_salida_*` → Fotos de salidas
- Prefijo `foto_sumidero_*` → Fotos de sumideros

**Elementos Decorativos** (posición original):
- Títulos de sección
- Logos
- Campos de identificación
- Cualquier otro elemento

**Regla Estricta:** Solo se clasifican por prefijo exacto, nunca por letra suelta.
Esto evita falsos positivos (ej: "FOTOS PAGINA 1" no se detecta como entrada).

#### 2.4 Agrupación de Elementos Técnicos

```typescript
function buildTechnicalGroups(placements: FieldPlacement[], pozo: Pozo): TechnicalGroup[]
```

**Estructura de un Grupo:**
```typescript
interface TechnicalGroup {
    type: 'entrada' | 'salida' | 'sumidero';
    number: number;           // 1, 2, 3...
    placements: FieldPlacement[];
    hasRealData: boolean;     // ¿El pozo tiene datos reales?
}
```

**Ejemplo de agrupación:**
```
ent_1_diametro  ┐
ent_1_material  ├─► Grupo { type: 'entrada', number: 1 }
ent_1_estado    │
foto_entrada_1  ┘

sal_1_diametro  ┐
sal_1_material  ├─► Grupo { type: 'salida', number: 1 }
sal_1_estado    │
foto_salida_1   ┘
```

**Verificación de Datos Reales:**
```typescript
function checkHasRealData(group: TechnicalGroup, pozo: Pozo): boolean {
    const idx = group.number - 1; // número 1 → índice 0

    if (group.type === 'entrada' || group.type === 'salida') {
        const tuberias = pozo.tuberias?.tuberias || [];
        const filtered = tuberias.filter(t => {
            const tipo = t.tipoTuberia?.value?.toLowerCase() || '';
            if (group.type === 'entrada') return tipo === 'entrada' || tipo === '';
            if (group.type === 'salida') return tipo === 'salida';
            return true;
        });
        return idx < filtered.length && !!filtered[idx];
    }

    if (group.type === 'sumidero') {
        const sumideros = pozo.sumideros?.sumideros || [];
        return idx < sumideros.length && !!sumideros[idx];
    }

    return false;
}
```

**Importante:** Solo se renderizan grupos con `hasRealData = true`.

#### 2.5 Layout de 3 Columnas

```
┌─────────────────────────────────────────────────────────────┐
│                         PÁGINA 2                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ ENTRADA 1│  │ SALIDA 1 │  │SUMIDERO 1│                 │
│  │ Ø: 8"    │  │ Ø: 10"   │  │ Tipo: R  │                 │
│  │ Mat: PVC │  │ Mat: GRES│  │ Ø: 6"    │                 │
│  │ Est: B   │  │ Est: R   │  │ H: 0.5m  │                 │
│  │ [FOTO]   │  │ [FOTO]   │  │ [FOTO]   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ ENTRADA 2│  │ SALIDA 2 │  │SUMIDERO 2│                 │
│  │ ...      │  │ ...      │  │ ...      │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Constantes de Layout (A4 Portrait = 210mm x 297mm):**
```typescript
const PAGE_WIDTH_MM = 210;
const PAGE_MARGIN_LEFT = 10;
const PAGE_MARGIN_RIGHT = 10;
const USABLE_WIDTH = 190; // 210 - 10 - 10

const COL_GAP = 4; // mm entre columnas
const COL_WIDTH = (190 - 4*2) / 3; // ~60.67mm cada columna

const COL1_X = 10;                    // Entradas
const COL2_X = 10 + 60.67 + 4;       // Salidas
const COL3_X = 10 + 60.67*2 + 4*2;   // Sumideros
```

**Alturas:**
```typescript
const GROUP_HEIGHT_MM = 35;      // Altura típica de un grupo
const TITLE_HEIGHT_MM = 7;       // Altura del título del grupo
const FIELD_HEIGHT_MM = 6;       // Altura de cada campo
const GROUP_GAP_MM = 4;          // Separación entre grupos
const HEADER_BUFFER_MM = 5;      // Buffer sobre el header
```

#### 2.6 Reposicionamiento en Columnas

```typescript
function repositionGroupsInColumn(
    groups: TechnicalGroup[],
    colX: number,
    startY: number,
    pageNumber: number
): FieldPlacement[]
```

**Algoritmo:**
```
1. Iniciar currentY = startY
2. Para cada grupo:
   a. Calcular altura del grupo
   b. Posicionar título en currentY
   c. Posicionar campos en currentY + TITLE_HEIGHT_MM
   d. Incrementar currentY += altura_grupo + GROUP_GAP_MM
3. Retornar placements reposicionados
```

**Cálculo de Altura de Grupo:**
```typescript
function calculateGroupHeight(placements: FieldPlacement[]): number {
    const fotoPlacement = placements.find(p => p.fieldId.startsWith('foto_'));
    const textPlacements = placements.filter(p => !p.fieldId.startsWith('foto_'));

    const textHeight = TITLE_HEIGHT_MM + 
                      textPlacements.reduce((sum, p) => 
                          sum + (p.height || FIELD_HEIGHT_MM) + 1, 0);
    const fotoHeight = fotoPlacement ? (fotoPlacement.height || 20) : 0;

    return Math.max(textHeight, fotoHeight, GROUP_HEIGHT_MM);
}
```

**Sentido del desplazamiento:** VERTICAL hacia abajo, dentro de cada columna.

#### 2.7 Reconstrucción Final

```typescript
adapted.placements = [
    ...page1Placements,       // Página 1 intacta (NUNCA se toca)
    ...otherPlacements,       // Decorativos de página 2 (posición original)
    ...repositionedPlacements, // Técnicos reorganizados (nueva posición)
    ...otherPagePlacements,   // Páginas 3+ intactas
];
```

### Paso 3: Renderizado

```typescript
for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
    // Saltar página 2 si está vacía
    if (pageIdx === 2 && shouldSkipPage2) {
        console.log('⏭️ Omitiendo página 2 (sin contenido)');
        continue;
    }

    if (pageIdx > 1) doc.addPage();

    for (const el of allElements) {
        // Renderizar solo elementos de esta página
        if (!isHeader && elementPage !== pageIdx) continue;
        
        // Renderizar shape o placement
        if (el.isShape) {
            await renderShape(doc, el);
        } else {
            await renderPlacement(doc, el, pozo, blobStore, usedPhotoIds);
        }
    }
}
```

---

## Reglas de Negocio

### 1. Reorganización de Tuberías

**Antes de llegar al generador de PDF**, las tuberías ya están reorganizadas:

```javascript
// En el parser de Excel
tuberias = [
  entrada_orden_1,  // índice 0 → ent_1_*
  entrada_orden_2,  // índice 1 → ent_2_*
  entrada_orden_3,  // índice 2 → ent_3_*
  entrada_orden_4,  // índice 3 → ent_4_*
  entrada_orden_5,  // índice 4 → ent_5_*
  entrada_orden_6,  // índice 5 → ent_6_*
  entrada_orden_7,  // índice 6 → ent_7_*
  entrada_orden_8,  // índice 7 → ent_8_*
  salida_orden_1,   // índice 8 → sal_1_*
  salida_orden_2,   // índice 9 → sal_2_*
  salida_orden_3,   // índice 10 → sal_3_*
  salida_orden_4,   // índice 11 → sal_4_*
  salida_orden_5,   // índice 12 → sal_5_*
  salida_orden_6,   // índice 13 → sal_6_*
  salida_orden_7,   // índice 14 → sal_7_*
  salida_orden_8,   // índice 15 → sal_8_*
]
```

**Mapeo a campos del diseño:**
```
tuberias[0] → ent_1_diametro, ent_1_material, ent_1_estado, foto_entrada_1
tuberias[1] → ent_2_diametro, ent_2_material, ent_2_estado, foto_entrada_2
...
tuberias[8] → sal_1_diametro, sal_1_material, sal_1_estado, foto_salida_1
```

### 2. Filtrado por Tipo de Tubería

```typescript
const filtered = tuberias.filter(t => {
    const tipo = t.tipoTuberia?.value?.toLowerCase() || '';
    if (group.type === 'entrada') return tipo === 'entrada' || tipo === '';
    if (group.type === 'salida') return tipo === 'salida';
    return true;
});
```

**Importante:** Si `tipoTuberia` está vacío, se asume que es entrada.

### 3. Tracking de Fotos Usadas

```typescript
const usedPhotoIds = new Set<string>();

// Al resolver una foto
if (found) {
    usedPhotoIds.add(found.id);
    return blobStore.getUrl(found.blobId);
}
```

**Propósito:** Evitar que la misma foto se use múltiples veces en diferentes campos.

### 4. Búsqueda Flexible de Fotos

```typescript
const found = pozo.fotos?.fotos?.find(f => {
    if (usedPhotoIds.has(f.id)) return false;

    const subcat = String(f.subcategoria || '').toUpperCase();
    const filename = String(f.filename || '').toUpperCase();
    const tipo = String(f.tipo || '').toUpperCase();

    return (
        subcat === targetCode ||
        subcat.includes(targetCode) ||
        filename.includes(`-${targetCode}.`) ||
        filename.includes(`-${targetCode}-`) ||
        filename.endsWith(`-${targetCode}`) ||
        tipo === targetCode
    );
});
```

**Criterios de búsqueda:**
1. Subcategoría exacta (ej: `E1`)
2. Subcategoría contiene código (ej: `E1-EXTRA`)
3. Filename contiene `-E1.` (ej: `PZ1666-E1.jpg`)
4. Filename contiene `-E1-` (ej: `PZ1666-E1-DETALLE.jpg`)
5. Filename termina en `-E1` (ej: `PZ1666-E1`)
6. Tipo exacto (ej: `E1`)

---

## Casos Especiales

### Caso 1: Pozo sin Tuberías ni Sumideros

```
Entrada: Pozo con solo datos básicos (identificación, ubicación)
Resultado: Página 2 se OMITE completamente
PDF final: Solo página 1
```

### Caso 2: Pozo con Solo Entradas

```
Entrada: 3 entradas, 0 salidas, 0 sumideros
Resultado: 
  - Columna 1: ENTRADA 1, ENTRADA 2, ENTRADA 3
  - Columna 2: Vacía
  - Columna 3: Vacía
```

### Caso 3: Pozo con Entradas y Salidas

```
Entrada: 5 entradas, 2 salidas, 0 sumideros
Resultado:
  - Columna 1: ENTRADA 1-5 (apiladas verticalmente)
  - Columna 2: SALIDA 1-2 (apiladas verticalmente)
  - Columna 3: Vacía
```

### Caso 4: Pozo Completo

```
Entrada: 7 entradas, 1 salida, 3 sumideros
Resultado:
  - Columna 1: ENTRADA 1-7
  - Columna 2: SALIDA 1
  - Columna 3: SUMIDERO 1-3
```

### Caso 5: Más de 8 Elementos por Tipo

```
Entrada: 10 entradas
Resultado: Solo se muestran las primeras 8
Razón: El diseño solo tiene slots para 8 elementos por tipo
```

### Caso 6: Fotos Faltantes

```
Entrada: Campo foto_entrada_1 pero no hay foto con código E1
Resultado: Se muestra placeholder "Sin foto" en gris
```

---

## Ejemplos Prácticos

### Ejemplo 1: Pozo M700

**Datos del Excel:**
```
Tuberías (después de reorganizar):
  [0] Domiciliaria, Entrada, Orden=1, Ø=-, Z=-
  [1] S1138, Entrada, Orden=2, Ø=8, Z=0.7860
  [2] M701, Entrada, Orden=3, Ø=8, Z=2.1450
  [3] Domiciliaria, Entrada, Orden=4, Ø=-, Z=-
  [4] S1137, Entrada, Orden=5, Ø=8, Z=0.7310
  [5] Domiciliaria, Entrada, Orden=6, Ø=-, Z=-
  [6] S1136, Entrada, Orden=7, Ø=8, Z=0.6270
  [7] null (vacío)
  [8] C1130, Salida, Orden=1, Ø=8, Z=2.6466
```

**Grupos detectados:**
```
Grupo 1: { type: 'entrada', number: 1, hasRealData: true }
Grupo 2: { type: 'entrada', number: 2, hasRealData: true }
Grupo 3: { type: 'entrada', number: 3, hasRealData: true }
Grupo 4: { type: 'entrada', number: 4, hasRealData: true }
Grupo 5: { type: 'entrada', number: 5, hasRealData: true }
Grupo 6: { type: 'entrada', number: 6, hasRealData: true }
Grupo 7: { type: 'entrada', number: 7, hasRealData: true }
Grupo 8: { type: 'entrada', number: 8, hasRealData: false } ← NO se renderiza
Grupo 9: { type: 'salida', number: 1, hasRealData: true }
```

**Layout final:**
```
Columna 1 (Entradas):
  Y=54mm: ENTRADA 1 (Domiciliaria, -, -)
  Y=89mm: ENTRADA 2 (S1138, 8", 0.7860)
  Y=124mm: ENTRADA 3 (M701, 8", 2.1450)
  Y=159mm: ENTRADA 4 (Domiciliaria, -, -)
  Y=194mm: ENTRADA 5 (S1137, 8", 0.7310)
  Y=229mm: ENTRADA 6 (Domiciliaria, -, -)
  Y=264mm: ENTRADA 7 (S1136, 8", 0.6270)

Columna 2 (Salidas):
  Y=54mm: SALIDA 1 (C1130, 8", 2.6466)

Columna 3 (Sumideros):
  (vacía)
```

### Ejemplo 2: Pozo PZ1666

**Datos:**
```
Tuberías:
  [0] Entrada 1, Ø=8, Material=PVC, Estado=Bueno
  [1] Entrada 2, Ø=6, Material=GRES, Estado=Regular
  [8] Salida 1, Ø=10, Material=Concreto, Estado=Bueno

Sumideros:
  [0] Sumidero 1, Tipo=Rejilla, Ø=6

Fotos:
  - PZ1666-E1.jpg (Entrada 1)
  - PZ1666-E2.jpg (Entrada 2)
  - PZ1666-S1.jpg (Salida 1)
  - PZ1666-SUM1.jpg (Sumidero 1)
```

**Resultado:**
```
Columna 1:
  ENTRADA 1: Ø=8, Mat=PVC, Est=Bueno, [FOTO E1]
  ENTRADA 2: Ø=6, Mat=GRES, Est=Regular, [FOTO E2]

Columna 2:
  SALIDA 1: Ø=10, Mat=Concreto, Est=Bueno, [FOTO S1]

Columna 3:
  SUMIDERO 1: Tipo=Rejilla, Ø=6, [FOTO SUM1]
```

---

## Conclusión

La lógica de generación de la página 2 es un sistema complejo que:

1. **Evalúa** si la página debe generarse
2. **Clasifica** elementos en técnicos vs decorativos
3. **Agrupa** elementos técnicos por tipo y número
4. **Verifica** qué grupos tienen datos reales
5. **Reposiciona** grupos en un layout de 3 columnas
6. **Renderiza** solo los grupos con datos

El sistema está diseñado para ser:
- **Dinámico**: Se adapta a cualquier cantidad de datos
- **Inteligente**: Solo muestra lo que existe
- **Preciso**: Respeta el diseño original para elementos no técnicos
- **Robusto**: Maneja casos edge (fotos faltantes, datos vacíos, etc.)

La clave del éxito está en la **separación de responsabilidades** y el **respeto al Muro de Berlín** (página 1 nunca se toca).
