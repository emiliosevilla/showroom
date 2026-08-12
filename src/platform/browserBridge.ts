import type { ActionContext, ActionId, ActionResult } from './types';
import { getNativeBridge } from './types';

function revokeLater(url: string) {
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function openBlob(file: File, download: boolean) {
  const url = URL.createObjectURL(file);
  if (download) {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    revokeLater(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
    revokeLater(url);
  }
}

/** Non-destructive actions only — never delete or relocate source files on disk. */
export async function runBrowserAction(
  actionId: ActionId,
  ctx: ActionContext
): Promise<ActionResult> {
  const { entry, app } = ctx;
  const native = getNativeBridge();

  switch (actionId) {
    case 'open':
    case 'openInTab': {
      if (!entry.fileObject) return { ok: false, message: 'file_not_hydrated' };
      await openBlob(entry.fileObject, false);
      return { ok: true };
    }
    case 'download': {
      if (!entry.fileObject) return { ok: false, message: 'file_not_hydrated' };
      await openBlob(entry.fileObject, true);
      return { ok: true };
    }
    case 'share': {
      if (!navigator.share) return { ok: false, message: 'share_unsupported' };
      try {
        const shareData: ShareData = {
          title: entry.name,
          text: entry.path,
        };
        if (entry.fileObject && navigator.canShare?.({ files: [entry.fileObject] })) {
          shareData.files = [entry.fileObject];
        }
        await navigator.share(shareData);
        return { ok: true };
      } catch {
        return { ok: false, message: 'share_cancelled' };
      }
    }
    case 'copyPath': {
      try {
        await navigator.clipboard.writeText(entry.path);
        return { ok: true, message: 'path_copied' };
      } catch {
        return { ok: false, message: 'clipboard_failed' };
      }
    }
    case 'favorite': {
      app.toggleFavorite(entry.path);
      return { ok: true };
    }
    case 'prepareToSend': {
      if (entry.fileObject && navigator.share) {
        try {
          const data: ShareData = { title: entry.name, files: [entry.fileObject] };
          if (navigator.canShare?.(data)) {
            await navigator.share(data);
            return { ok: true };
          }
        } catch {
          /* fall through */
        }
      }
      if (entry.fileObject) {
        await openBlob(entry.fileObject, true);
        return { ok: true, message: 'prepare_send_downloaded' };
      }
      return { ok: false, message: 'file_not_hydrated' };
    }
    case 'openWith': {
      if (native?.openWith) {
        await native.openWith(entry.absolutePath || entry.path);
        return { ok: true };
      }
      return { ok: false, message: 'requires_desktop' };
    }
    case 'revealInFolder': {
      if (native?.revealInFolder) {
        await native.revealInFolder(entry.absolutePath || entry.path);
        return { ok: true };
      }
      return { ok: false, message: 'requires_desktop' };
    }
    case 'moveToContainer': {
      return { ok: true, message: 'use_drag_drop' };
    }
    default:
      return { ok: false, message: 'unknown_action' };
  }
}

export function isActionAvailable(actionId: ActionId): boolean {
  const native = getNativeBridge();
  if (actionId === 'openWith') return Boolean(native?.openWith);
  if (actionId === 'revealInFolder') return Boolean(native?.revealInFolder);
  if (actionId === 'share') return typeof navigator !== 'undefined' && Boolean(navigator.share);
  return true;
}
