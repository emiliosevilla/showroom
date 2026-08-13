import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { getImagePreview } from '../exportHtml';
import { FileEntry } from '../utils/fileSystem';
import { FileTypeIconPlate } from '../utils/fileTypeIcon';
import { getNativeBridge } from '../platform/types';
import {
  ZoomOut, ZoomIn, Maximize,
  Play, Pause, Loader2, ChevronLeft, ChevronRight, FileQuestion
} from 'lucide-react';
import { Tooltip } from './Tooltip';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg'];
const TEXT_EXTS = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py'];

type Props = {
  fileEntry?: FileEntry | null;
  name?: string;
  className?: string;
  emptyLabel?: string;
};

function IconFallbackPreview({
  fileEntry,
  displayName,
  className = '',
}: {
  fileEntry: FileEntry;
  displayName: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const ext = fileEntry.extension?.toLowerCase() || '';
  const [nativeIconUrl, setNativeIconUrl] = useState<string | null>(null);
  const [nativeTried, setNativeTried] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNativeIconUrl(null);
    setNativeTried(false);

    const native = getNativeBridge();
    const target = fileEntry.absolutePath || fileEntry.path;
    // Skip native icons on macOS — app.getFileIcon can crash Electron on Tahoe (macOS 26).
    const isDarwin = typeof navigator !== 'undefined' && /Macintosh|Mac OS X/i.test(navigator.userAgent);
    if (!native?.getFileIcon || !target || isDarwin) {
      setNativeTried(true);
      return;
    }
    // Prefer OS icons only for binaries/bundles where Lucide is a weak stand-in.
    const OS_ICON_EXTS = new Set(['exe', 'msi', 'app', 'dmg', 'pkg', 'apk', 'bat', 'cmd', 'com']);
    if (ext && !OS_ICON_EXTS.has(ext)) {
      setNativeTried(true);
      return;
    }

    native
      .getFileIcon(target)
      .then((url) => {
        if (!cancelled) setNativeIconUrl(url || null);
      })
      .catch(() => {
        if (!cancelled) setNativeIconUrl(null);
      })
      .finally(() => {
        if (!cancelled) setNativeTried(true);
      });

    return () => {
      cancelled = true;
    };
  }, [fileEntry.path, fileEntry.absolutePath, ext]);

  return (
    <div className={`flex flex-col items-center justify-center h-full text-text-secondary gap-4 p-6 ${className}`}>
      {!nativeTried && !nativeIconUrl ? (
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-60" />
      ) : nativeIconUrl ? (
        <div className="flex items-center justify-center rounded-3xl border border-border-lite bg-surface-card shadow-sm p-6">
          <img
            src={nativeIconUrl}
            alt=""
            className="w-28 h-28 object-contain drop-shadow-md"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      ) : (
        <FileTypeIconPlate extension={ext} className="p-8" iconClassName="w-28 h-28" />
      )}
      <div className="text-center max-w-full space-y-1">
        <p className="text-sm font-medium text-text-primary truncate max-w-[16rem]" title={displayName}>
          {displayName}
        </p>
        {ext ? (
          <p className="text-[11px] font-mono uppercase tracking-wider opacity-60">.{ext}</p>
        ) : (
          <p className="text-xs opacity-60">{t('preview_type_unsupported')}</p>
        )}
      </div>
    </div>
  );
}

export function FilePreviewPane({ fileEntry, name = '', className = '', emptyLabel }: Props) {
  const { t } = useLanguage();
  const ext = fileEntry?.extension?.toLowerCase() || '';
  const isImage = IMAGE_EXTS.includes(ext);
  const isVideo = VIDEO_EXTS.includes(ext);
  const isAudio = AUDIO_EXTS.includes(ext);
  const isText = TEXT_EXTS.includes(ext);
  const isPdf = ext === 'pdf';
  const canContentPreview = isImage || isPdf || isVideo || isAudio || isText;

  const previewUrl = useMemo(() => {
    if (!fileEntry?.fileObject) return '';
    if (isImage) return getImagePreview(fileEntry.fileObject);
    if (isVideo || isAudio || isPdf) return URL.createObjectURL(fileEntry.fileObject);
    return '';
  }, [fileEntry, isImage, isVideo, isAudio, isPdf]);

  useEffect(() => {
    return () => {
      if (previewUrl && (isVideo || isAudio || isPdf)) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, isVideo, isAudio, isPdf]);

  const [scale, setScale] = useState(1);
  const zoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const resetZoom = () => setScale(1);

  useEffect(() => {
    setScale(1);
    setPage(0);
    setTextContent(null);
  }, [fileEntry?.path]);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10000;

  useEffect(() => {
    if (isText && fileEntry?.fileObject) {
      fileEntry.fileObject.text().then(setTextContent).catch(() => setTextContent(t('preview_read_error') as string));
    }
  }, [isText, fileEntry, t]);

  const totalPages = textContent ? Math.ceil(textContent.length / pageSize) : 0;
  const currentTextPage = textContent ? textContent.slice(page * pageSize, (page + 1) * pageSize) : '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  if (!fileEntry) {
    return (
      <div className={`flex flex-col items-center justify-center text-text-secondary gap-2 bg-surface-base/40 ${className}`}>
        <FileQuestion className="w-10 h-10 opacity-40" />
        <p className="text-sm">{emptyLabel || t('select_file_preview')}</p>
      </div>
    );
  }

  const displayName = name || fileEntry.name;

  // No content preview (executables, archives, etc.): show OS icon or Lucide type icon.
  if (!canContentPreview) {
    return (
      <IconFallbackPreview
        fileEntry={fileEntry}
        displayName={displayName}
        className={className}
      />
    );
  }

  if (!fileEntry.fileObject && !fileEntry.hydrated) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!fileEntry.fileObject) {
    return (
      <IconFallbackPreview
        fileEntry={fileEntry}
        displayName={displayName}
        className={className}
      />
    );
  }

  return (
    <div className={`relative flex flex-col overflow-hidden bg-surface-base/30 ${className}`}>
      {isImage && (
        <>
          <div className="absolute top-3 right-3 flex items-center gap-1 z-10 bg-surface-card/90 backdrop-blur-md p-1 rounded-lg shadow border border-border-lite">
            <Tooltip content={t('zoom_out')}>
              <button type="button" onClick={zoomOut} aria-label={t('zoom_out')} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary">
                <ZoomOut className="w-4 h-4" />
              </button>
            </Tooltip>
            <span className="text-xs font-mono w-10 text-center select-none">{Math.round(scale * 100)}%</span>
            <Tooltip content={t('zoom_in')}>
              <button type="button" onClick={zoomIn} aria-label={t('zoom_in')} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary">
                <ZoomIn className="w-4 h-4" />
              </button>
            </Tooltip>
            <div className="w-px h-4 bg-border-mute mx-1" />
            <Tooltip content={t('reset_zoom')}>
              <button type="button" onClick={resetZoom} aria-label={t('reset_zoom')} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary">
                <Maximize className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
          <div className="overflow-auto w-full h-full flex items-center justify-center custom-scrollbar p-2">
            <img
              src={previewUrl}
              alt={displayName}
              style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out', transformOrigin: 'center' }}
              className="object-contain max-h-full max-w-full rounded"
            />
          </div>
        </>
      )}

      {isPdf && previewUrl && (
        <iframe title={displayName} src={previewUrl} className="w-full h-full border-0 bg-white" />
      )}

      {isVideo && previewUrl && (
        <div className="flex flex-col items-center justify-center w-full h-full gap-3 p-3">
          <video
            ref={videoRef}
            controls
            className="max-h-[calc(100%-3rem)] max-w-full rounded-lg shadow border border-border-mute bg-black"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src={previewUrl} type={`video/${ext === 'ogg' ? 'ogg' : ext}`} />
          </video>
          <Tooltip content={isPlaying ? t('pause') : t('play')}>
            <button type="button" onClick={togglePlay} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card border border-border-lite text-sm font-medium text-text-primary">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? t('pause') : t('play')}
            </button>
          </Tooltip>
        </div>
      )}

      {isAudio && previewUrl && (
        <div className="flex flex-col items-center justify-center w-full h-full gap-6 p-6">
          <FileTypeIconPlate extension={ext} className="p-6" iconClassName="w-20 h-20" />
          <audio controls className="w-full max-w-md">
            <source src={previewUrl} type={`audio/${ext}`} />
          </audio>
        </div>
      )}

      {isText && (
        <div className="flex flex-col w-full h-full overflow-hidden">
          <div className="flex-1 overflow-auto p-4 custom-scrollbar">
            {textContent === null ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
            ) : (
              <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">{currentTextPage}</pre>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border-lite bg-surface-base shrink-0">
              <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface-card disabled:opacity-30 text-sm">
                <ChevronLeft className="w-4 h-4" /> {t('prev_page')}
              </button>
              <span className="text-xs font-mono text-text-secondary">{t('page_of', page + 1, totalPages)}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface-card disabled:opacity-30 text-sm">
                {t('next_page')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
