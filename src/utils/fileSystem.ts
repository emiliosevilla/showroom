import { ClassificationResult } from '../services/classifier';

/** MIME types for extensions previewed via blob URL (img/video/audio/iframe). Electron's native readFile returns a plain buffer with no type, so it must be set explicitly for the browser to render it instead of showing raw bytes. */
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

function mimeFromExtension(extension?: string): string | undefined {
  if (!extension) return undefined;
  return MIME_BY_EXTENSION[extension.toLowerCase()];
}

export interface FileEntry {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  lastModified?: number;
  /** Bytes; filled on hydrate or from FileList fallback. */
  size?: number;
  /**
   * Birth/creation time. Filled by desktop NativeBridge / Node scan;
   * not available via browser File API alone.
   */
  createdAt?: number;
  extension?: string;
  fileObject?: File;
  fileHandle?: any; // FileSystemFileHandle
  /** Absolute filesystem path when running under Electron native scan. */
  absolutePath?: string;
  /** True after ensureFileHydrated resolved content metadata. */
  hydrated?: boolean;
}

/** Lazily load File blob + size/lastModified from FileSystemFileHandle or NativeBridge. */
export async function ensureFileHydrated(entry: FileEntry): Promise<FileEntry> {
  if (entry.kind !== 'file') return entry;
  if (entry.hydrated && entry.fileObject) return entry;
  if (entry.fileObject) {
    return {
      ...entry,
      size: entry.size ?? entry.fileObject.size,
      lastModified: entry.lastModified || entry.fileObject.lastModified,
      hydrated: true,
    };
  }
  if (entry.fileHandle && typeof entry.fileHandle.getFile === 'function') {
    try {
      const file: File = await entry.fileHandle.getFile();
      return {
        ...entry,
        fileObject: file,
        size: file.size,
        lastModified: file.lastModified,
        hydrated: true,
      };
    } catch (err) {
      console.warn(`Failed to hydrate file ${entry.path}:`, err);
      return { ...entry, hydrated: true };
    }
  }
  const native = typeof window !== 'undefined' ? window.__SHOWROOM_NATIVE__ : undefined;
  if (native?.readFile) {
    try {
      const buffer = await native.readFile(entry.absolutePath || entry.path);
      const file = new File([buffer], entry.name, {
        type: mimeFromExtension(entry.extension),
        lastModified: entry.lastModified || Date.now(),
      });
      let createdAt = entry.createdAt;
      if (createdAt == null && native.getBirthTime) {
        try {
          createdAt = await native.getBirthTime(entry.absolutePath || entry.path);
        } catch {
          /* ignore */
        }
      }
      return {
        ...entry,
        fileObject: file,
        size: entry.size ?? file.size,
        lastModified: entry.lastModified || file.lastModified,
        createdAt,
        hydrated: true,
      };
    } catch (err) {
      console.warn(`Failed to hydrate native file ${entry.path}:`, err);
      return { ...entry, hydrated: true };
    }
  }
  return { ...entry, hydrated: true };
}

export function processFileList(files: FileList): { entries: FileEntry[], rootName: string } {
  const result: FileEntry[] = [];
  const directoriesAdded = new Set<string>();

  if (files.length === 0) return { entries: [], rootName: '' };
  
  const firstPath = files[0].webkitRelativePath || files[0].name;
  const rootName = firstPath.split('/')[0] || 'Carpeta';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/');
    
    if (parts.length > 0) {
      parts.shift(); // Remove root folder name
    }

    if (parts.length === 0) continue;

    let currentPath = '';
    for (let j = 0; j < parts.length - 1; j++) {
      currentPath = currentPath ? `${currentPath}/${parts[j]}` : parts[j];
      if (!directoriesAdded.has(currentPath)) {
        directoriesAdded.add(currentPath);
        result.push({
          path: currentPath,
          name: parts[j],
          kind: 'directory',
          lastModified: 0,
          extension: ''
        });
      }
    }

    const name = parts[parts.length - 1];
    const nameParts = name.split('.');
    const extension = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() || '' : '';
    const finalPath = parts.join('/');

    result.push({
      path: finalPath,
      name: name,
      kind: 'file',
      lastModified: file.lastModified,
      size: file.size,
      extension: extension,
      fileObject: file,
      hydrated: true,
    });
  }

  return { entries: result, rootName };
}

/** Max nested folders (not counting the root handle) before scan throws LIMIT_EXCEEDED. */
export const MAX_FOLDERS = 3000;
/** Max files before scan throws LIMIT_EXCEEDED. */
export const MAX_FILES = 25000;
/** Folders+files within a single subtree before it's skipped instead of failing the whole scan (e.g. node_modules). */
export const MAX_ENTRIES_PER_SUBFOLDER = 2000;

export interface ScanResult {
  entries: FileEntry[];
  /** Relative paths of subfolders skipped for exceeding MAX_ENTRIES_PER_SUBFOLDER. */
  skippedFolders: string[];
}

export async function scanDirectory(
  dirHandle: any,
  basePath: string = '',
  signal?: AbortSignal
): Promise<ScanResult> {
  let folderCount = 0;
  let fileCount = 0;
  const skippedFolders: string[] = [];

  // Recursive function requires async iteration over handles.
  // localCounters is shared across an entire subtree once one starts being throttled,
  // so the per-subfolder cap applies to the whole subtree, not just its immediate children.
  async function readDir(handle: any, currentPath: string, localCounters?: { count: number }): Promise<FileEntry[]> {
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    const entries: FileEntry[] = [];
    try {
      // @ts-ignore - TS might not have full types for FileSystemHandle methods natively everywhere
      for await (const entry of handle.values()) {
        if (signal?.aborted) {
          throw new Error('AbortError');
        }

        const fullRelativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          if (fileCount >= MAX_FILES) {
            throw new Error('LIMIT_EXCEEDED');
          }

          const parts = entry.name.split('.');
          const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';

          entries.push({
            path: fullRelativePath,
            name: entry.name,
            kind: 'file',
            lastModified: 0, // Not fetching file object immediately
            extension,
            fileHandle: entry
          });

          fileCount++;
          if (localCounters) {
            localCounters.count++;
            if (localCounters.count > MAX_ENTRIES_PER_SUBFOLDER) {
              throw new Error('SUBFOLDER_TOO_LARGE');
            }
          }
        } else if (entry.kind === 'directory') {
          if (folderCount >= MAX_FOLDERS) {
            throw new Error('LIMIT_EXCEEDED');
          }

          entries.push({
            path: fullRelativePath,
            name: entry.name,
            kind: 'directory',
            lastModified: 0,
            extension: ''
          });

          folderCount++;
          if (localCounters) {
            localCounters.count++;
            if (localCounters.count > MAX_ENTRIES_PER_SUBFOLDER) {
              throw new Error('SUBFOLDER_TOO_LARGE');
            }
          }

          // Let's cap the depth to avoid massive freeze on "C:\"!
          if (fullRelativePath.split('/').length < 20) {
            if (localCounters) {
              // Already throttling an ancestor subtree — keep using the same counter.
              entries.push(...(await readDir(entry, fullRelativePath, localCounters)));
            } else {
              try {
                entries.push(...(await readDir(entry, fullRelativePath, { count: 0 })));
              } catch (e) {
                if (e instanceof Error && e.message === 'SUBFOLDER_TOO_LARGE') {
                  skippedFolders.push(fullRelativePath);
                } else if (e instanceof Error && (e.message === 'AbortError' || e.message === 'LIMIT_EXCEEDED')) {
                  throw e;
                } else {
                  console.warn(`Ignoring directory ${fullRelativePath} due to access error:`, e);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && (e.message === 'AbortError' || e.message === 'LIMIT_EXCEEDED' || e.message === 'SUBFOLDER_TOO_LARGE')) {
        throw e;
      }
      console.warn(`Failed reading directory ${currentPath}:`, e);
    }
    return entries;
  }

  const entries = await readDir(dirHandle, basePath);
  return { entries, skippedFolders };
}
