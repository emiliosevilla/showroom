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

- `[x]` **Fase 3: Refactorización Arquitectónica de App.tsx (Completado)**
  - `[x]` Crear `/src/components/FileItem.tsx` y migrar código.
  - `[x]` Crear `/src/components/ContainerColumn.tsx` y migrar código.
  - `[x]` Crear `/src/components/Modals/` (`FilePreviewModal.tsx`, `ContainerSettingsModal.tsx`).
  - `[x]` Crear `/src/hooks/useDragAndDrop.ts` para lógica de `@dnd-kit`.
  - `[x]` Crear `/src/hooks/useFileSystem.ts` para lógica de escaneo y estado de archivos.
  - `[x]` Limpiar y ensamblar `App.tsx` usando los nuevos componentes y hooks (`App.tsx`: 1353 líneas; objetivo original ~800).

- `[ ]` **Fase 4: Verificación**
  - `[x]` Puerta automatizada: `npm run build` y `npm run lint` pasan (también tras QA fixes en `dev`, 2026-08-12).
  - `[x]` QA manual local (Chrome/Edge): DnD, Cambiar carpeta, sesiones, modal de apariencia (fixes en `7d81e63`).
  - `[ ]` Comprobar manualmente que los límites de escaneo se respetan y no saturan la memoria.
  - `[ ]` Smoke de la build empaquetada (cuando exista el ejecutable).

- `[ ]` **Fase 5: Distribución como ejecutable (aplazado — otro día)**
  - `[ ]` Elegir stack de empaquetado (p. ej. Electron, Tauri u otra opción).
  - `[ ]` Configurar build de escritorio a partir del frontend Vite/React.
  - `[ ]` Generar instalable/ejecutable para macOS (y otras plataformas si aplica).
  - `[ ]` Smoke del ejecutable (abrir app, seleccionar carpeta, DnD básico, export).
  - Nota: **no** es una app web desplegada; `prod` en git es la rama de release del código, no un hosting Vercel/URL pública.
