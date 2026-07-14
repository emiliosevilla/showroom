# showroom

Local folder organizer that runs 100% in the browser. `showroom` scans a folder on your computer, automatically classifies its files into categories ("containers") and lets you reorganize them with drag & drop before exporting them to a ZIP, or generating a self-contained HTML gallery for sharing.

There is no backend or AI: all processing happens on the client and no file leaves your computer unless you explicitly export it.

## How it works

1. **You select a local folder** using the browser's File System Access API (`showDirectoryPicker`), with a `<input webkitdirectory>` fallback for browsers without support.
2. **The app scans the folder** recursively (`scanDirectory`) and classifies each file by extension into predefined categories — Executables and Tools, Graphic Resources, Documentation, Compressed Files, Multimedia, Code Projects, Subfolders, and Miscellaneous (`src/services/classifier.ts`).
3. **You edit the result**: drag files between containers, rename or change the color/icon of each container, mark favorites, search and filter, sort in list view (name, container, extension, date), and undo or redo changes (Ctrl+Z / Ctrl+Shift+Z).
4. **You decide what to do with the result**:
   - **Export ZIP**: downloads a `.zip` with a folder per container (via JSZip).
   - **Export as HTML**: generates a self-contained and portable HTML gallery (with no external runtime dependencies, featuring light/dark mode) displaying the containers and their files — designed for sharing or consulting without needing the app.

## Features

- Automatic file classification by extension.
- Grid, columns, and list views.
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
- Multi-language support (i18n).
- Scan limits to prevent memory overload (max 100 subfolders and 1000 files per subfolder).

## Run locally

**Requirements:** Node.js

```bash
npm install
npm run dev
```

Other available scripts:

```bash
npm run build   # production build (Vite)
npm run preview # serves the production build
npm run lint    # type checking with tsc --noEmit
npm run clean   # deletes dist/
```

There is no need to configure any environment variables or API keys to use the app: all processing is local in the browser.

## Technical stack

Vite 6 + React 19 + TypeScript (`strict` enabled), Tailwind CSS v4, `@dnd-kit` for drag & drop, `recharts` for statistics, `lucide-react` for icons, `motion` for animations, and `jszip` for ZIP export.

## Contributing

This repository is managed through forks and Pull Requests. Check out [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.
