const { contextBridge, ipcRenderer } = require('electron');

let workspaceRoot = '';

/**
 * Desktop NativeBridge injected for the React app.
 * Matches window.__SHOWROOM_NATIVE__ contract in src/platform/types.ts
 */
const bridge = {
  setWorkspaceRoot(root) {
    workspaceRoot = root || '';
  },

  getWorkspaceRoot() {
    return workspaceRoot;
  },

  async pickFolder() {
    const result = await ipcRenderer.invoke('native:pickFolder');
    if (result?.path) {
      workspaceRoot = result.path;
    }
    return result;
  },

  async scanFolder(rootPath) {
    const root = rootPath || workspaceRoot;
    if (!root) throw new Error('NO_WORKSPACE_ROOT');
    workspaceRoot = root;
    return ipcRenderer.invoke('native:scanFolder', root);
  },

  async readFile(relativeOrAbs) {
    if (!workspaceRoot) throw new Error('NO_WORKSPACE_ROOT');
    return ipcRenderer.invoke('native:readFile', workspaceRoot, relativeOrAbs);
  },

  async revealInFolder(relativeOrAbs) {
    if (!workspaceRoot) throw new Error('NO_WORKSPACE_ROOT');
    return ipcRenderer.invoke('native:revealInFolder', workspaceRoot, relativeOrAbs);
  },

  async openWith(relativeOrAbs) {
    if (!workspaceRoot) throw new Error('NO_WORKSPACE_ROOT');
    return ipcRenderer.invoke('native:openWith', workspaceRoot, relativeOrAbs);
  },

  async getBirthTime(relativeOrAbs) {
    if (!workspaceRoot) throw new Error('NO_WORKSPACE_ROOT');
    return ipcRenderer.invoke('native:getBirthTime', workspaceRoot, relativeOrAbs);
  },

  async getFileIcon(relativeOrAbs) {
    if (!workspaceRoot) throw new Error('NO_WORKSPACE_ROOT');
    return ipcRenderer.invoke('native:getFileIcon', workspaceRoot, relativeOrAbs);
  },
};

contextBridge.exposeInMainWorld('__SHOWROOM_NATIVE__', bridge);
contextBridge.exposeInMainWorld('__SHOWROOM_IS_ELECTRON__', true);
