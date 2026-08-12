import type { FileEntry } from '../utils/fileSystem';

export type ActionId =
  | 'open'
  | 'openInTab'
  | 'openWith'
  | 'download'
  | 'share'
  | 'copyPath'
  | 'favorite'
  | 'moveToContainer'
  | 'trash'
  | 'zipSelection'
  | 'compress'
  | 'revealInFolder'
  | 'prepareToSend';

export type ActionGroupId = 'open' | 'organize' | 'share' | 'danger';

export interface ActionDefinition {
  id: ActionId;
  group: ActionGroupId;
  /** Requires Phase 5 native shell when true and bridge method missing. */
  requiresNative?: boolean;
}

export interface ActionContext {
  entry: FileEntry;
  selectedPaths: string[];
  entriesByPath: Map<string, FileEntry>;
  containerId: string;
  /** App callbacks for in-memory organize actions */
  app: {
    toggleFavorite: (path: string) => void;
    moveToTrash: (paths: string[]) => void;
    zipPaths: (paths: string[]) => Promise<void>;
    showToast?: (message: string) => void;
  };
}

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Optional native capabilities injected by a desktop shell (Phase 5).
 * When present and callable, FileActionMenu enables the matching actions.
 */
export interface NativeBridge {
  revealInFolder?(absoluteOrRelativePath: string): Promise<void>;
  openWith?(absoluteOrRelativePath: string): Promise<void>;
  getBirthTime?(absoluteOrRelativePath: string): Promise<number | undefined>;
  compressWithSystem?(paths: string[]): Promise<void>;
}

declare global {
  interface Window {
    __SHOWROOM_NATIVE__?: NativeBridge;
  }
}

export function getNativeBridge(): NativeBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__SHOWROOM_NATIVE__;
}
