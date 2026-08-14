# showroom

Espacio virtual para organizar carpetas locales. Corre 100% en tu máquina (navegador o app de escritorio Electron): escanea una carpeta, clasifica archivos en contenedores semánticos y te deja reorganizarlos con drag & drop **sin tocar el disco**.

No hay backend: nada sale de tu equipo. En escritorio puedes abrir **cualquier carpeta**; el entorno virtual no ofrece acciones destructivas (no borra ni mueve archivos originales).

## Por qué no es “otro Finder / Explorer”

| Explorador nativo | showroom |
|---|---|
| Organiza la jerarquía real del disco | Organiza una **vista virtual** (contenedores) sin reescribir carpetas |
| Mover / borrar cambia el sistema de archivos | Solo reordena la clasificación en memoria + sesión |
| Una carpeta = una estructura fija | Recuerda la conformación de contenedores de las **últimas 10** carpetas |
| Búsqueda genérica del SO | Búsqueda con tokens, filtros por tipo y agrupación |

Úsalo cuando quieras **pensar** cómo está organizada una carpeta (Downloads, proyectos, entregas) sin miedo a romper nada.

## Cómo funciona

1. **Selecciona una carpeta** — File System Access API, fallback `<input webkitdirectory>`, o diálogo nativo en Electron.
2. **Escanea + clasifica** por extensión (`src/services/classifier.ts`). Siempre hay un contenedor **Otros**. Metadatos se hidratan bajo demanda con `ensureFileHydrated`.
3. **Edita** en dos layouts:
   - **Total**: sidebar + contenedor enfocado (lista | preview + propiedades + acciones).
   - **Individual**: todos los contenedores en columnas.
4. **Sesión**: al volver a la bienvenida, las últimas 10 carpetas aparecen en orden alfabético; al reabrirlas se restaura la distribución de contenedores.

## Características

- Clasificación automática + contenedor **Otros** (sin papelera ni subcarpetas).
- Preview in-panel, favoritos, undo/redo, dark mode, i18n ES/EN.
- Búsqueda inteligente (nombre / ruta / extensión), filtros y agrupar por extensión o contenedor.
- Acciones no destructivas (abrir, descargar, compartir, copiar ruta, favorito; en desktop `revealInFolder` / `openWith`).
- Límites de escaneo (100 carpetas / 1000 archivos).

## Ejecutar en local (navegador)

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
npm run lint
npm run test:scan-limits
npm run clean
npm run dev:cursor       # /cursor.html embed host
```

## App de escritorio (Electron)

```bash
npm run electron:dev       # build UI + ventana Electron
npm run electron:pack:mac  # → release/*.dmg y *-mac.zip (arm64)
npm run electron:pack:win  # → release/*-win.zip (x64)
```

Artefactos en `release/` (gitignored). Icono: `electron/icons/icon.svg`. Distribución prevista por **GitHub público**, sin App Store ni Play Store: los packs **no se firman** (`mac.identity: null`) y electron-builder no consulta el llavero. En macOS, la primera vez: clic derecho → Abrir (Gatekeeper). En Windows, SmartScreen puede avisar de editor desconocido.

Código del shell: `electron/main.cjs`, `electron/preload.cjs`. Empaquetado: `electron-builder.yml` (solo `dist/` + `electron/`).

Si falla la descarga de Electron desde GitHub, los scripts ya usan `ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/`.

## Stack

Vite 6 + React 19 + TypeScript, Tailwind CSS v4, `@dnd-kit`, `recharts`, `lucide-react`, `motion`, Electron 43 + electron-builder.

Licencia: [MIT](LICENSE.md). Roadmap: [`docs/task.md`](docs/task.md).

## Contribuir

Forks y Pull Requests — ver [CONTRIBUTING.md](CONTRIBUTING.md).
