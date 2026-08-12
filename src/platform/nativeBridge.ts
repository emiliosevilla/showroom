/**
 * Desktop shell bridge helpers.
 * Electron preload assigns window.__SHOWROOM_NATIVE__.
 * No destructive disk APIs (no delete / trash / system compress into workspace).
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
};

export function registerNativeBridge(bridge: NativeBridge) {
  if (typeof window !== 'undefined') {
    window.__SHOWROOM_NATIVE__ = bridge;
  }
}

export function isElectronShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__SHOWROOM_IS_ELECTRON__);
}
