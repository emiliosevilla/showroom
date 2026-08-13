const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { existsSync } = require('fs');

const MAX_FOLDERS = 100;
const MAX_FILES = 1000;
const MAX_DEPTH = 20;

/** @type {BrowserWindow | null} */
let mainWindow = null;

function isDev() {
  return !app.isPackaged;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'showroom',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev() && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  if (isDev() && process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

/**
 * @param {string} rootDir
 * @param {string} relative
 * @param {{ folderCount: number, fileCount: number }} counters
 * @returns {Promise<Array<object>>}
 */
async function scanDirRecursive(rootDir, relative, counters) {
  const entries = [];
  const abs = relative ? path.join(rootDir, relative) : rootDir;
  let dirents;
  try {
    dirents = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const dirent of dirents) {
    if (dirent.name.startsWith('.')) continue;
    const rel = relative ? `${relative}/${dirent.name}` : dirent.name;
    const full = path.join(rootDir, rel);

    if (dirent.isDirectory()) {
      if (counters.folderCount >= MAX_FOLDERS) {
        throw new Error('LIMIT_EXCEEDED');
      }
      counters.folderCount += 1;
      entries.push({
        path: rel,
        name: dirent.name,
        kind: 'directory',
        lastModified: 0,
        size: 0,
        createdAt: undefined,
        extension: '',
        absolutePath: full,
      });
      if (rel.split('/').length < MAX_DEPTH) {
        entries.push(...(await scanDirRecursive(rootDir, rel, counters)));
      }
    } else if (dirent.isFile()) {
      if (counters.fileCount >= MAX_FILES) {
        throw new Error('LIMIT_EXCEEDED');
      }
      counters.fileCount += 1;
      const parts = dirent.name.split('.');
      const extension = parts.length > 1 ? (parts.pop() || '').toLowerCase() : '';
      let st;
      try {
        st = await fs.stat(full);
      } catch {
        st = null;
      }
      entries.push({
        path: rel,
        name: dirent.name,
        kind: 'file',
        lastModified: st ? Math.floor(st.mtimeMs) : 0,
        size: st ? st.size : 0,
        createdAt: st && st.birthtimeMs ? Math.floor(st.birthtimeMs) : undefined,
        extension,
        absolutePath: full,
      });
    }
  }
  return entries;
}

function resolveUnderRoot(workspaceRoot, targetPath) {
  if (!workspaceRoot) {
    throw new Error('NO_WORKSPACE_ROOT');
  }
  const abs = path.isAbsolute(targetPath)
    ? path.normalize(targetPath)
    : path.normalize(path.join(workspaceRoot, targetPath));
  const root = path.normalize(workspaceRoot + path.sep);
  if (abs !== path.normalize(workspaceRoot) && !abs.startsWith(root)) {
    throw new Error('PATH_OUTSIDE_WORKSPACE');
  }
  return abs;
}

function registerIpc() {
  ipcMain.handle('native:pickFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const folderPath = result.filePaths[0];
    return {
      path: folderPath,
      name: path.basename(folderPath),
    };
  });

  ipcMain.handle('native:scanFolder', async (_evt, rootPath) => {
    const counters = { folderCount: 0, fileCount: 0 };
    return scanDirRecursive(rootPath, '', counters);
  });

  ipcMain.handle('native:readFile', async (_evt, workspaceRoot, relativeOrAbs) => {
    const abs = resolveUnderRoot(workspaceRoot, relativeOrAbs);
    const buf = await fs.readFile(abs);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  });

  ipcMain.handle('native:revealInFolder', async (_evt, workspaceRoot, relativeOrAbs) => {
    const abs = resolveUnderRoot(workspaceRoot, relativeOrAbs);
    shell.showItemInFolder(abs);
  });

  ipcMain.handle('native:openWith', async (_evt, workspaceRoot, relativeOrAbs) => {
    const abs = resolveUnderRoot(workspaceRoot, relativeOrAbs);
    const err = await shell.openPath(abs);
    if (err) throw new Error(err);
  });

  ipcMain.handle('native:getBirthTime', async (_evt, workspaceRoot, relativeOrAbs) => {
    const abs = resolveUnderRoot(workspaceRoot, relativeOrAbs);
    const st = await fs.stat(abs);
    return st.birthtimeMs ? Math.floor(st.birthtimeMs) : undefined;
  });

  ipcMain.handle('native:getFileIcon', async (_evt, workspaceRoot, relativeOrAbs) => {
    // macOS 26 (Tahoe)+Electron: app.getFileIcon can SIGTRAP in ThreadPoolForegroundWorker.
    // See Electron community reports; use Lucide type icons on Darwin instead.
    if (process.platform === 'darwin') return null;
    const abs = resolveUnderRoot(workspaceRoot, relativeOrAbs);
    try {
      const image = await app.getFileIcon(abs, { size: 'normal' });
      if (!image || image.isEmpty()) return null;
      const png = image.toPNG();
      if (!png || png.length === 0 || png.length > 1_500_000) return null;
      return `data:image/png;base64,${png.toString('base64')}`;
    } catch {
      return null;
    }
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Silence unused import warning in some tooling
void existsSync;
