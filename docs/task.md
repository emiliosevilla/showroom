# Roadmap de Implementación: Showroom App

- `[x]` **Fase 1: Lógica de Sistema de Archivos y Seguridad (Completado)**
  - `[x]` **Limpieza:** Eliminar por completo la función `applyChangesToDisk` y sus dependencias en la UI (App.tsx).
  - `[x]` **AbortController:** Integrar `AbortSignal` en `scanDirectory` para permitir detener la carga.
  - `[x]` **Límites Seguros:** Implementar límite de 100 subcarpetas y 1000 archivos por carpeta, lanzando un error (`LIMIT_EXCEEDED`) si se superan.
  - `[x]` **Lazy Loading de Archivos:** Modificar `FileEntry` para guardar el `fileHandle` en lugar del objeto `File`, reduciendo el uso de memoria RAM.
  - `[x]` **Manejo de Errores UI:** Capturar `LIMIT_EXCEEDED` y `AbortError` en `App.tsx` y mostrar mensajes descriptivos al usuario, impidiendo la carga.

- `[x]` **Fase 2: Internacionalización (i18n) (Completado)**
  - `[x]` Identificar textos hardcodeados en `App.tsx`.
  - `[x]` Añadir claves a `src/i18n/` y reemplazar por `t('clave')`.

- `[x]` **Fase 3: Refactorización Arquitectónica de App.tsx (Completado)**
  - `[x]` Componentes (`FileItem`, `ContainerColumn`, Modals), hooks (`useDragAndDrop`, `useFileSystem`).

- `[x]` **Fase 4: Verificación y UX editor**
  - `[x]` `npm run build` / `lint` / `test:scan-limits`.
  - `[x]` Vista Total (split) + Individual (columns); tooltips; NativeBridge API; sin vista tabla.
  - `[x]` Footer solo en bienvenida.

- `[x]` **Fase 5: Distribución como ejecutable (Electron)**
  - `[x]` Stack: Electron 43 + electron-builder.
  - `[x]` Shell + NativeBridge (`electron/main.cjs`, `preload.cjs`).
  - `[x]` Pack lean: solo `dist/` + `electron/` (sin `node_modules` en el asar); deps de frontend en `devDependencies`.
  - `[x]` Limpieza: eliminados `patch.js`, `patch_out.js`, `metadata.json`, deps muertas (`@google/genai`, `express`, …).
  - `[x]` Scripts con `env -u ELECTRON_RUN_AS_NODE` (evita fallo en entornos Cursor).
  - `[x]` Artefactos: nombres estables `showroom-mac-arm64.dmg` / `showroom-win-x64.zip` (`artifactName`) para `/releases/latest/download/…`.
  - `[x]` Icono de app: cara alegre con ojos grandes (`electron/icons/icon.svg` + `icon.png`); visible en README.
  - `[x]` Firma omitida a propósito: distribución por GitHub público, no App Store / Play Store. `mac.identity: null` + `CSC_IDENTITY_AUTO_DISCOVERY=false` (no consulta el llavero). Gatekeeper: clic derecho → Abrir; Windows: aviso SmartScreen de editor desconocido.
  - `[ ]` NSIS `.exe` (Wine o runner Windows) — opcional; el zip portable es el artefacto Windows.
  - `[x]` Icono de app: `electron/icons/icon.svg` (cara / ojos; electron-builder → icns/ico).
  - `[x]` Smoke automatizable (2026-08-13): `npm run lint` OK; `test:scan-limits` 5/5; binario `.app` arranca (`env -u ELECTRON_RUN_AS_NODE`); zip Windows `unzip -t` OK.
  - `[x]` Crash macOS 26 Tahoe: `app.getFileIcon` → EXC_BREAKPOINT en ThreadPoolForegroundWorker; desactivado en Darwin (fallback Lucide).
  - `[x]` Electron 37 → 43.4.0 (cierra alertas Dependabot de Electron EOL; `pickFolder` recuerda última carpeta por el defaultPath de 43).
  - `[ ]` Smoke QA manual UI (abrir carpeta, containers, preview, sesiones, búsqueda) en Finder / Windows.
  - `[x]` Valorar upgrade Electron (37 → 43+) para mejor soporte Tahoe.

- `[x]` **Fase 6: Producto virtual seguro (2026-08)**
  - `[x]` Sin papelera / sin subcarpetas; contenedor **Otros** siempre presente.
  - `[x]` Sin exportación ZIP ni galería HTML; sin APIs nativas de compresión.
  - `[x]` Sin acciones destructivas en menús / bridges (no delete / trash en disco).
  - `[x]` Sesiones: últimas 10 carpetas, listado A–Z en inicio; persistencia de containers.
  - `[x]` Búsqueda con tokens + filtros + agrupar por extensión/contenedor.
  - `[x]` Copy desktop: privado + seguro; LICENSE MIT; eliminado MAINTAINER-GUIDE.
