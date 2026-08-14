# showroom

<p align="center">
  <img src="electron/icons/icon.svg" width="168" height="168" alt="showroom monogram: letter S on an indigo rounded square">
</p>

<p align="center">
  <strong>Virtual workspace for a local folder.</strong><br>
  Classify and rearrange files without changing anything on disk.<br>
  Everything stays on your computer. Nothing is uploaded.
</p>

---

## Install

**You do not install Python, Node, git, or anything else.** The download *is* the app (Chromium is already inside). GitHub cannot guess your computer, so pick your system:

| Your computer | Download |
|---|---|
| **Mac** (Apple Silicon) | [showroom-mac-arm64.dmg](https://github.com/emiliosevilla/showroom/releases/latest/download/showroom-mac-arm64.dmg) |
| **Windows** | [showroom-win-x64.zip](https://github.com/emiliosevilla/showroom/releases/latest/download/showroom-win-x64.zip) |

Those links always mean **the newest [GitHub Release](https://github.com/emiliosevilla/showroom/releases/latest)** built from [`prod`](https://github.com/emiliosevilla/showroom/tree/prod).

Builds are unsigned (no App Store / Play Store).

### Mac

1. Click the Mac link. Open the `.dmg`.
2. Drag **showroom** into **Applications**.
3. Open it from Applications.

The first launch will likely say the app is **damaged** and should go to the Trash. It is not damaged: the build is unsigned, and macOS Gatekeeper labels GitHub downloads that way (Control-click → Open does not help on Apple Silicon). In Terminal:

```bash
xattr -cr /Applications/showroom.app
open /Applications/showroom.app
```

If the `.dmg` itself refuses to open, run `xattr -cr ~/Downloads/showroom-mac-arm64.dmg` first, then open it again.

Next times: click the icon as usual. The only lasting fix is Apple Developer ID + notarization ($99/year).

### Windows

1. Click the Windows link. Unzip the folder.
2. Double-click **showroom.exe**.
3. If Windows says “Windows protected your PC”: **More info** → **Run anyway**.

Optional (Terminal, same files):

```bash
# Mac
curl -LO https://github.com/emiliosevilla/showroom/releases/latest/download/showroom-mac-arm64.dmg
open showroom-mac-arm64.dmg

# Windows (PowerShell)
curl.exe -LO https://github.com/emiliosevilla/showroom/releases/latest/download/showroom-win-x64.zip
```

The UI is English or Spanish (selector in the header).

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

1. Pick a folder.
2. Files are classified by extension. An **Others** container is always present.
3. Two layouts: **Total** (sidebar + focused container + preview) and **Individual** (one column per container).
4. The welcome screen lists the last 10 folders A–Z and restores their containers.

Scan limits to prevent overload: 100 subfolders / 1000 files, per scan.

---

## Run from source

Public/stable code is [`prod`](https://github.com/emiliosevilla/showroom/tree/prod) (GitHub default). You need [Node.js 20+](https://nodejs.org/).

```bash
git clone https://github.com/emiliosevilla/showroom.git
cd showroom
npm install
npm run dev
```

Open `http://localhost:3000`, pick a local folder, try search / preview / drag-and-drop. Desktop window: `npm run electron:dev`.

Package the same tree:

```bash
npm run electron:pack:mac  # → release/showroom-mac-arm64.dmg (and .zip)
npm run electron:pack:win  # → release/showroom-win-x64.zip
```

Packs skip code signing. Icon: `electron/icons/icon.svg`. Other scripts: `npm run lint`, `npm run test:scan-limits`, `npm run clean`.

---

## Stack

Vite 6, React 19, TypeScript, Tailwind CSS v4, Electron 43, electron-builder.

---

## Author

[Emilio Sevilla Ortego](https://github.com/emiliosevilla)

License: [MIT](LICENSE.md). Roadmap: [`docs/task.md`](docs/task.md). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).
