# showroom

Local folder organizer that runs 100% in the browser. `showroom` scans a folder on your computer, automatically classifies its files into categories ("containers") and lets you reorganize them with drag & drop before exporting them to a ZIP, or generating a self-contained HTML gallery for sharing.

There is no backend or AI: all processing happens on the client and no file leaves your computer unless you explicitly export it.

## How it works

1. **You select a local folder** using the browser's File System Access API (`showDirectoryPicker`), with a `<input webkitdirectory>` fallback for browsers without support.
2. **The app scans the folder** recursively (`scanDirectory`) and classifies each file by extension into predefined categories — Executables and Tools, Graphic Resources, Documentation, Compressed Files, Multimedia, Code Projects, Subfolders, and Miscellaneous (`src/services/classifier.ts`). File metadata (size, dates, blob) is hydrated lazily with `ensureFileHydrated` when you select a file.
3. **You edit the result** in two layouts:
   - **Total** (grid): sidebar of containers + focused container with a split panel — file list (sortable) on the left, preview + properties + actions on the right.
   - **Individual** (columns): all containers side by side.
   Drag files between containers, rename or restyle containers, mark favorites, search and filter, and undo / redo (Ctrl+Z / Ctrl+Shift+Z).
4. **You decide what to do with the result**:
   - **Export ZIP**: downloads a `.zip` with a folder per container (via JSZip).
   - **Export as HTML**: generates a self-contained and portable HTML gallery (with no external runtime dependencies, featuring light/dark mode) displaying the containers and their files — designed for sharing or consulting without needing the app.

## Features

- Automatic file classification by extension.
- **Total** layout: split inspector (list + preview + properties/actions).
- **Individual** layout: multi-column containers.
- In-panel file preview (images with zoom, video/audio, text paging, PDF iframe).
- File action menu: suggested by extension, frequent habits, grouped actions; browser-realistic today, with `NativeBridge` hooks ready for a future desktop shell (`src/platform/`).
- Accessible tooltips on icon controls (`Tooltip.tsx`).
- Drag & drop reordering for files and containers (`@dnd-kit`).
- Container editing: name, color, and icon.
- Trash bin with delete/restore.
- Favorites persisted in `localStorage`.
- Folder statistics in a pie chart (`recharts`).
- Undo / redo.
- Dark / light mode.
- Sharing via the browser's Web Share API.
- Export to ZIP or self-contained static HTML.
- Lightweight state persistence in IndexedDB (`src/utils/idb.ts`).
- Multi-language support (i18n; ES / EN).
- Scan limits to prevent memory overload (max 100 subfolders and 1000 files).

## Run locally

**Requirements:** Node.js

```bash
npm install
npm run dev
```

Other available scripts:

```bash
npm run build            # production build (Vite)
npm run preview          # serves the production build
npm run lint             # type checking with tsc --noEmit
npm run test:scan-limits # automated scan-limit gate
npm run clean            # deletes dist/
npm run dev:cursor       # opens /cursor.html embed host (iframe tooling)
```

There is no need to configure any environment variables or API keys to use the app: all processing is local in the browser.

## Technical stack

Vite 6 + React 19 + TypeScript (`strict` enabled), Tailwind CSS v4, `@dnd-kit` for drag & drop, `recharts` for statistics, `lucide-react` for icons, `motion` for animations, and `jszip` for ZIP export.

Desktop packaging (Electron / Tauri / etc.) is planned as **Phase 5** — see [`docs/task.md`](docs/task.md). The UI already consumes a shared `ActionId` / `NativeBridge` API so native actions (`revealInFolder`, `openWith`, birth time, system compress) can plug in later via `window.__SHOWROOM_NATIVE__`.

## Roadmap

Implementation status lives in [`docs/task.md`](docs/task.md) (Phases 1–4 done; Phase 5 packaging deferred).

## Contributing

This repository is managed through forks and Pull Requests. Check out [CONTRIBUTING.md](CONTRIBUTING.md) (English) or [CONTRIBUIR.md](CONTRIBUIR.md) (Spanish) for the full workflow.
