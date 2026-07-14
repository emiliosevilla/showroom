# Roadmap de Implementación: Showroom App

- `[x]` **Fase 1: Lógica de Sistema de Archivos y Seguridad (Completado)**
  - `[x]` **Limpieza:** Eliminar por completo la función `applyChangesToDisk` y sus dependencias en la UI (App.tsx).
  - `[x]` **AbortController:** Integrar `AbortSignal` en `scanDirectory` para permitir detener la carga.
  - `[x]` **Límites Seguros:** Implementar límite de 100 subcarpetas y 1000 archivos por carpeta, lanzando un error (`LIMIT_EXCEEDED`) si se superan.
  - `[x]` **Lazy Loading de Archivos:** Modificar `FileEntry` para guardar el `fileHandle` en lugar del objeto `File`, reduciendo el uso de memoria RAM.
  - `[x]` **Manejo de Errores UI:** Capturar `LIMIT_EXCEEDED` y `AbortError` en `App.tsx` y mostrar mensajes descriptivos al usuario, impidiendo la carga.

- `[x]` **Fase 2: Internacionalización (i18n) (Completado)**
  - `[x]` Identificar textos hardcodeados en `App.tsx` (ej. "Apariencia del Contenedor", "Cancelar", "Guardar Cambios").
  - `[x]` Añadir nuevas claves a los diccionarios en `src/i18n/`.
  - `[x]` Reemplazar textos estáticos por `t('clave')`.

- `[ ]` **Fase 3: Refactorización Arquitectónica de App.tsx**
  - `[ ]` Crear `/src/components/FileItem.tsx` y migrar código.
  - `[ ]` Crear `/src/components/ContainerColumn.tsx` y migrar código.
  - `[ ]` Crear `/src/components/Modals/` (`FilePreviewModal.tsx`, `ContainerSettingsModal.tsx`).
  - `[ ]` Crear `/src/hooks/useDragAndDrop.ts` para lógica de `@dnd-kit`.
  - `[ ]` Crear `/src/hooks/useFileSystem.ts` para lógica de escaneo y estado de archivos.
  - `[ ]` Limpiar y ensamblar `App.tsx` usando los nuevos componentes y hooks.

- `[ ]` **Fase 4: Verificación**
  - `[ ]` Comprobar que los límites de escaneo se respetan y no saturan la memoria.
  - `[ ]` Verificar que la organización de Drag & Drop y la UI sigue funcionando como antes.
