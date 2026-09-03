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
  | 'revealInFolder'
  | 'prepareToSend';

export type ActionGroupId = 'open' | 'organize' | 'share';

export interface ActionDefinition {
  id: ActionId;
  group: ActionGroupId;
  requiresNative?: boolean;
}

export interface ActionContext {
  entry: FileEntry;
  selectedPaths: string[];
  entriesByPath: Map<string, FileEntry>;
  containerId: string;
  app: {
    toggleFavorite: (path: string) => void;
    showToast?: (message: string) => void;
  };
}

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Optional native capabilities injected by the desktop shell.
 * Intentionally read-only / non-destructive toward source files.
 */
export interface NativeBridge {
  setWorkspaceRoot?(root: string): void;
  getWorkspaceRoot?(): string;
  pickFolder?(): Promise<{ path: string; name: string } | null>;
  scanFolder?(rootPath?: string): Promise<{
    entries: Array<{
      path: string;
      name: string;
      kind: 'file' | 'directory';
      lastModified?: number;
      size?: number;
      createdAt?: number;
      extension?: string;
      absolutePath?: string;
    }>;
    /** Relative paths of subfolders skipped for exceeding the per-subfolder entry cap. */
    skippedFolders: string[];
  }>;
  readFile?(relativeOrAbs: string): Promise<ArrayBuffer>;
  revealInFolder?(absoluteOrRelativePath: string): Promise<void>;
  openWith?(absoluteOrRelativePath: string): Promise<void>;
  getBirthTime?(absoluteOrRelativePath: string): Promise<number | undefined>;
  /** OS / file-associated icon as a data URL (Electron). */
  getFileIcon?(absoluteOrRelativePath: string): Promise<string | null>;
}

declare global {
  interface Window {
    __SHOWROOM_NATIVE__?: NativeBridge;
    __SHOWROOM_IS_ELECTRON__?: boolean;
  }
}

export function getNativeBridge(): NativeBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__SHOWROOM_NATIVE__;
}
