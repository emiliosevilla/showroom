/** True when running inside any iframe (e.g. Cursor Simple Browser or cursor.html host). */
export function isEmbeddedFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent blocks access to window.top
    return true;
  }
}

/** Prefer webkitdirectory fallback over showDirectoryPicker in embedded contexts. */
export function shouldUseFolderInputFallback(): boolean {
  if (isEmbeddedFrame()) return true;
  return !('showDirectoryPicker' in window);
}
