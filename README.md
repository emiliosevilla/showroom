# showroom

A **virtual workspace** for a local folder. Scan a directory, sort files into semantic containers, and rearrange them with drag-and-drop **without changing anything on disk**.

Everything runs on your machine (browser or desktop). There is no backend and nothing is uploaded.

---

## Try a demo

You need [Node.js 20+](https://nodejs.org/) and git.

```bash
git clone https://github.com/emiliosevilla/showroom.git
cd showroom
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:3000`). Choose a folder on your computer — Downloads or the Desktop is enough. showroom classifies files into containers; you can search, preview, and drag items around. Closing the tab does not move or delete those files.

For the desktop window instead of the browser:

```bash
npm run electron:dev
```

The UI is available in English and Spanish (selector in the header).

---

## Download and install

Packaged apps are attached to [GitHub Releases](https://github.com/emiliosevilla/showroom/releases) (not the App Store or Play Store). Builds are **unsigned**.

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `showroom-*-arm64.dmg` or `showroom-*-arm64-mac.zip` |
| Windows (x64) | `showroom-*-win.zip` |

If there is no release yet, use [Try a demo](#try-a-demo) or package locally (`npm run electron:pack:mac` / `npm run electron:pack:win`).

### macOS

1. Open the `.dmg` and drag **showroom** into Applications (or unzip the `-mac.zip`).
2. First launch: **Control-click** the app → **Open**, then confirm. Gatekeeper warns because the build is not notarized.
3. Later launches work from Launchpad or Spotlight as usual.

### Windows

1. Unzip `showroom-*-win.zip`.
2. Run `showroom.exe`.
3. If SmartScreen appears: **More info** → **Run anyway** (unknown publisher, unsigned zip).

---

## What it is (and is not)

| Finder / Explorer | showroom |
|---|---|
| Organizes the real folder tree | Organizes a **virtual** view (containers) without rewriting folders |
| Move / delete changes the filesystem | Only the classification in memory + session changes |
| One folder → one fixed layout | Remembers container layout for the **last 10** folders |
| OS-wide search | Tokens, type filters, group-by extension or container |

Use it when you want to **think** about how a folder is organized (Downloads, project dumps, handoffs) without risking the originals. There is no trash, no zip export, and no destructive file actions.

---

## How it works

1. Pick a folder (File System Access API, `<input webkitdirectory>`, or a native dialog in Electron).
2. Files are classified by extension. An **Others** container is always present.
3. Two layouts: **Total** (sidebar + focused container + preview) and **Individual** (one column per container).
4. Coming back to the welcome screen lists the last 10 folders A–Z and restores their containers.

Scan limits: 100 folders / 1000 files per scan.

---

## Package from source

```bash
npm run electron:pack:mac  # → release/*.dmg and *-mac.zip (arm64)
npm run electron:pack:win  # → release/*-win.zip (x64)
```

Output is gitignored under `release/`. Packs skip code signing (`mac.identity: null`); electron-builder does not read your keychain. App icon source: `electron/icons/icon.svg`.

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run test:scan-limits`, `npm run clean`.

If Electron’s GitHub download fails, the pack scripts already set `ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/`.

---

## Stack

Vite 6, React 19, TypeScript, Tailwind CSS v4, Electron 43, electron-builder.

License: [MIT](LICENSE.md). Roadmap: [`docs/task.md`](docs/task.md). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).
