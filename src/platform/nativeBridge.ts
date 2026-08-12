/**
 * Phase 5 desktop shell stub.
 *
 * A packaged app (Electron/Tauri/etc.) should assign:
 *   window.__SHOWROOM_NATIVE__ = { revealInFolder, openWith, getBirthTime, compressWithSystem }
 *
 * Until then, native-only actions stay disabled in the UI but use the same ActionId API.
 */
import type { NativeBridge } from './types';

export const DESKTOP_BRIDGE_STUB: NativeBridge = {
  async revealInFolder() {
    throw new Error('NOT_NATIVE');
  },
  async openWith() {
    throw new Error('NOT_NATIVE');
  },
  async getBirthTime() {
    return undefined;
  },
  async compressWithSystem() {
    throw new Error('NOT_NATIVE');
  },
};

/** Call from shell bootstrap once native APIs are ready. */
export function registerNativeBridge(bridge: NativeBridge) {
  if (typeof window !== 'undefined') {
    window.__SHOWROOM_NATIVE__ = bridge;
  }
}
