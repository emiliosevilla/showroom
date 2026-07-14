# Phase 3: Refactorización Arquitectónica de App.tsx

El archivo `App.tsx` actualmente tiene más de 2700 líneas y contiene múltiples componentes, lógica de estado compleja y constantes mezcladas. El objetivo de esta fase es dividir este monolito en una estructura modular y escalable.

## Open Questions

> [!WARNING] 
> **Diseño de los Modales**: ¿Quieres que mantenga los modales actuales basados en `div` fijos o prefieres que los actualice para usar el elemento nativo `<dialog>` de HTML5 según recomienda el comando `/modern-web-guidance`? (Recomiendo usar `<dialog>`).

## Proposed Changes

Vamos a extraer los componentes y lógica en una estructura de carpetas limpia. 

---

### UI Constants & Utils
Extraeremos la lógica de colores, iconos y renderizado para no saturar los componentes.

#### [NEW] src/utils/theme.ts
- Mover `COLOR_VARIANTS`, `AVAILABLE_ICONS` y la función `renderIcon`.

---

### Components / Modals
Extraeremos los modales independientes. Adaptaremos su estructura para usar el elemento `<dialog>` nativo si se aprueba.

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
- Importará todos los componentes anteriores.
- Mantendrá el contexto principal (estado global `classification`, eventos Dnd-kit `handleDragStart`, `handleDragOver`, `handleDragEnd`).
- Pasará de ~2700 líneas a unas ~800 líneas de lógica de negocio pura.

## Verification Plan

### Automated Tests
- Ejecutar `npm run build` para comprobar que todas las dependencias e importaciones de TypeScript son correctas.
- Ejecutar `npm run lint` para garantizar que no haya variables no utilizadas tras la separación.

### Manual Verification
- Comprobar que Drag and Drop sigue funcionando.
- Comprobar que la previsualización de archivos abre los modales correctamente.
- Verificar que no haya pérdidas de estado de React al organizar los contenedores.
