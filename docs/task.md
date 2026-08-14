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
  - `[x]` Stack: Electron 37 + electron-builder.
  - `[x]` Shell + NativeBridge (`electron/main.cjs`, `preload.cjs`).
  - `[x]` Pack lean: solo `dist/` + `electron/` (sin `node_modules` en el asar); deps de frontend en `devDependencies`.
  - `[x]` Limpieza: eliminados `patch.js`, `patch_out.js`, `metadata.json`, deps muertas (`@google/genai`, `express`, …).
  - `[x]` Scripts con `env -u ELECTRON_RUN_AS_NODE` (evita fallo en entornos Cursor).
  - `[x]` Artefactos regenerados (2026-08-14, icono SVG + zip Windows al día):
    - macOS: `release/showroom-0.1.0-arm64.dmg`, `release/showroom-0.1.0-arm64-mac.zip`
    - Windows x64: `release/showroom-0.1.0-win.zip`
  - `[ ]` Firma macOS: Apple Developer Program ($99/año) → certificado **Developer ID Application** en Keychain + notarización (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `hardenedRuntime: true`). Hoy: 0 identidades de codesign válidas; el pack sigue unsigned (Gatekeeper: clic derecho → Abrir).
  - `[ ]` Firma Windows: certificado Authenticode OV/EV (`WIN_CSC_LINK`) — no aplica al zip portable sin cert.
  - `[ ]` NSIS `.exe` (Wine o runner Windows).
  - `[x]` Icono de app: `electron/icons/icon.svg` (electron-builder lo convierte a icns/ico). Reemplazar el SVG si se quiere marca definitiva.
  - `[x]` Smoke automatizable (2026-08-13): `npm run lint` OK; `test:scan-limits` 5/5; binario `.app` arranca (`env -u ELECTRON_RUN_AS_NODE`); zip Windows `unzip -t` OK.
  - `[x]` Crash macOS 26 Tahoe: `app.getFileIcon` → EXC_BREAKPOINT en ThreadPoolForegroundWorker; desactivado en Darwin (fallback Lucide).
  - `[ ]` Smoke QA manual UI (abrir carpeta, containers, preview, sesiones, búsqueda) en Finder / Windows.
  - `[ ]` Valorar upgrade Electron (37 → 43+) para mejor soporte Tahoe.

- `[x]` **Fase 6: Producto virtual seguro (2026-08)**
  - `[x]` Sin papelera / sin subcarpetas; contenedor **Otros** siempre presente.
  - `[x]` Sin exportación ZIP ni galería HTML; sin APIs nativas de compresión.
  - `[x]` Sin acciones destructivas en menús / bridges (no delete / trash en disco).
  - `[x]` Sesiones: últimas 10 carpetas, listado A–Z en inicio; persistencia de containers.
  - `[x]` Búsqueda con tokens + filtros + agrupar por extensión/contenedor.
  - `[x]` Copy desktop: privado + seguro; LICENSE MIT; eliminado MAINTAINER-GUIDE.
