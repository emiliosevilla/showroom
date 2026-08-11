# Phase 3: Refactorización Arquitectónica de App.tsx

**Estado:** Completado (rama `feat-finish-pending`, HEAD `414eeb2`).

`App.tsx` pasó de un monolito de ~2700 líneas a **1353 líneas** tras extraer componentes y hooks (`useFileSystem`, `useDragAndDrop`). El objetivo original era ~800 líneas de lógica de ensamblado; el recuento actual refleja el estado real del archivo.

## Decisiones cerradas

> **Modales con `<dialog>` nativo** — Decidido e implementado. `FilePreviewModal.tsx` y `ContainerSettingsModal.tsx` usan el elemento HTML5 `<dialog>` en lugar de `div` fijos.

## Proposed Changes

Vamos a extraer los componentes y lógica en una estructura de carpetas limpia. 

---

### UI Constants & Utils
Extraeremos la lógica de colores, iconos y renderizado para no saturar los componentes.

#### [NEW] src/utils/theme.ts
- Mover `COLOR_VARIANTS`, `AVAILABLE_ICONS` y la función `renderIcon`.

---

### Components / Modals
Modales extraídos e implementados con `<dialog>` nativo.

#### [NEW] src/components/Modals/ContainerSettingsModal.tsx
- Contendrá el componente `ContainerSettingsModal` y su estado interno.

#### [NEW] src/components/Modals/FilePreviewModal.tsx
- Contendrá `FilePreviewModal`, gestionando el visor de imágenes, audio, video e iframe.

---

### Components / Core UI
Componentes clave de la interfaz.

#### [NEW] src/components/FileItem.tsx
- Contendrá el componente `FileItem` (y su hook dnd-kit `useSortable`).

#### [NEW] src/components/ContainerColumn.tsx
- Contendrá `ContainerColumn`, gestionando su visualización y área `Droppable`. También moveremos aquí `DetailDroppableArea` y `GridDroppableArea`.

#### [NEW] src/components/ListViewTable.tsx
- Contendrá la vista de tabla `ListViewTable`.

#### [NEW] src/components/SplitMasterItem.tsx
- Contendrá el listado izquierdo en la vista dividida `SplitMasterItem`.

#### [NEW] src/components/PreviewTooltip.tsx
- Contendrá el `PreviewTooltip`.

---

### Main App Component
El contenedor principal quedará limpio de componentes auxiliares.

#### [MODIFY] src/App.tsx
- Importa todos los componentes y hooks anteriores.
- Mantiene el ensamblado principal (estado global `classification`, orquestación DnD vía `useDragAndDrop`, escaneo vía `useFileSystem`).
- Resultado actual: **1353 líneas** (objetivo original ~800; reducción significativa respecto al monolito inicial).

## Verification Plan

### Automated Tests
- `[x]` `npm run build` — pasa en rama `feat-finish-pending` (2026-08-11).
- `[x]` `npm run lint` — pasa en rama `feat-finish-pending` (2026-08-11).

### Manual Verification (pendiente)
- `[ ]` Comprobar que Drag and Drop sigue funcionando.
- `[ ]` Comprobar que la previsualización de archivos abre los modales `<dialog>` correctamente.
- `[ ]` Verificar que no haya pérdidas de estado de React al organizar los contenedores.
- `[ ]` Comprobar que los límites de escaneo se respetan y no saturan la memoria.
