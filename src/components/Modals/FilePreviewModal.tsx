import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getImagePreview } from '../../exportHtml';
import { FileEntry } from '../../utils/fileSystem';
import { 
  X, ZoomOut, ZoomIn, Maximize, 
  Play, Pause, Loader2, ChevronLeft, ChevronRight 
} from 'lucide-react';

export const FilePreviewModal = ({ fileEntry, name, onClose }: { fileEntry?: FileEntry, name: string, onClose: () => void }) => {
  const { t } = useLanguage();
  const isImage = fileEntry?.extension && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(fileEntry.extension);
  const isVideo = fileEntry?.extension && ['mp4', 'webm', 'ogg'].includes(fileEntry.extension);
  const isAudio = fileEntry?.extension && ['mp3', 'wav', 'ogg'].includes(fileEntry.extension);
  const isText = fileEntry?.extension && ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py'].includes(fileEntry.extension);

  const previewUrl = useMemo(() => {
    if (isImage && fileEntry?.fileObject) {
      return getImagePreview(fileEntry.fileObject);
    }
    return '';
  }, [fileEntry, isImage]);

  const [scale, setScale] = useState(1);
  const zoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const resetZoom = () => setScale(1);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10000;
  
  useEffect(() => {
    if (isText && fileEntry?.fileObject) {
      fileEntry.fileObject.text().then(setTextContent).catch(() => setTextContent('No se pudo leer el archivo.'));
    }
  }, [isText, fileEntry]);

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

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      className="p-0 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-border-lite backdrop:bg-black/80 backdrop:backdrop-blur-sm m-auto animate-in zoom-in-95 duration-200 bg-surface-card"
    >
      <div className="flex justify-between items-center p-4 border-b border-border-lite bg-surface-base rounded-t-2xl shrink-0">
        <span className="font-bold text-lg text-text-primary truncate pr-4">{name.startsWith("cat_") ? t(name as any) : name}</span>
        <button onClick={handleClose} aria-label="Cerrar" className="text-text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 focus:outline-none">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center bg-surface-base/30 rounded-b-2xl p-4 min-h-[50vh]">
        {isImage && (
          <>
            <div className="absolute top-6 right-6 flex items-center gap-1 z-10 bg-surface-card/90 backdrop-blur-md p-1.5 rounded-lg shadow-lg border border-border-lite">
              <button onClick={zoomOut} aria-label="Alejar" className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono w-10 text-center select-none">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} aria-label="Acercar" className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary"><ZoomIn className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-border-mute mx-1"></div>
              <button onClick={resetZoom} aria-label={t("reset_zoom") || "Reset Zoom"} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary"><Maximize className="w-4 h-4" /></button>
            </div>
            <div className="overflow-auto w-full h-full flex items-center justify-center custom-scrollbar">
              <img src={previewUrl} alt={name} style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out', transformOrigin: 'center' }} className="object-contain max-h-[70vh] rounded-lg" />
            </div>
          </>
        )}

        {isVideo && fileEntry?.fileObject && (
           <div className="flex flex-col items-center justify-center w-full h-full gap-4">
              <video ref={videoRef} controls className="max-h-[60vh] rounded-xl shadow-lg border border-border-mute bg-black" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}>
                <source src={URL.createObjectURL(fileEntry.fileObject)} type={`video/${fileEntry.extension}`} />
                Tu navegador no soporta el video.
              </video>
              <div className="flex items-center gap-3 bg-surface-card px-4 py-2 rounded-full shadow-md border border-border-lite">
                 <button onClick={togglePlay} className="flex items-center gap-2 hover:text-indigo-500 text-sm font-medium transition-colors text-text-primary">
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    {isPlaying ? 'Pausar' : 'Reproducir'}
                 </button>
              </div>
           </div>
        )}

        {isAudio && fileEntry?.fileObject && (
          <div className="p-8 w-full max-w-md bg-surface-card rounded-2xl shadow-inner border border-border-lite">
            <audio controls className="w-full">
              <source src={URL.createObjectURL(fileEntry.fileObject)} type={`audio/${fileEntry.extension}`} />
              Tu navegador no soporta el audio.
            </audio>
          </div>
        )}

        {isText && (
          <div className="flex flex-col w-full h-full max-w-5xl bg-surface-card border border-border-lite rounded-xl shadow-inner overflow-hidden">
             <div className="flex-1 overflow-auto w-full p-6 bg-white dark:bg-black/20 custom-scrollbar">
               {textContent === null ? (
                 <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
               ) : (
                 <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">{currentTextPage}</pre>
               )}
             </div>
             {totalPages > 1 && (
               <div className="flex items-center justify-between px-4 py-3 border-t border-border-lite bg-surface-base">
                 <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-sm font-medium border border-transparent hover:border-border-lite">
                   <ChevronLeft className="w-4 h-4" /> Anterior
                 </button>
                 <span className="text-xs font-mono text-text-secondary bg-surface-card border border-border-lite px-3 py-1.5 rounded-full shadow-sm">Página {page + 1} de {totalPages}</span>
                 <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-sm font-medium border border-transparent hover:border-border-lite">
                   Siguiente <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
             )}
          </div>
        )}
      </div>
    </dialog>
  );
};
