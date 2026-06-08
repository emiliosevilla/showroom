import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { scanDirectory, FileEntry, processFileList, applyChangesToDisk } from './utils/fileSystem';
import { setKey, getKey } from './utils/idb';
import { classifyFiles, ClassificationResult } from './services/classifier';
import { generateEnhancedHtmlString, getImagePreview } from './exportHtml';
import { FolderSearch, Loader2, Download, Upload, FolderOpen, ArrowRight, CheckCircle, Search, Filter, Moon, Sun, Share2, LayoutGrid, List, ArrowUpDown, Star, Trash2, RotateCcw, ChevronDown, ChevronRight, CheckSquare, Square, Plus, X, ArrowDownAZ, PieChart as PieChartIcon, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Play, Pause, ChevronLeft, Settings, Type, Image as ImageIcon, Video, Music, FileText, Archive, Code, Briefcase, Camera, Book, File, Globe, Key, Box, Heart, Zap, Shield, Database, Folder } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  pointerWithin,
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';

const COLOR_VARIANTS: Record<string, { bg: string, text: string, border: string, lightBg: string, darkText: string }> = {
  'slate': { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lightBg: 'bg-slate-50', darkText: 'text-slate-700' },
  'red': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-200', lightBg: 'bg-red-50', darkText: 'text-red-700' },
  'orange': { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-200', lightBg: 'bg-orange-50', darkText: 'text-orange-700' },
  'amber': { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', lightBg: 'bg-amber-50', darkText: 'text-amber-700' },
  'emerald': { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', lightBg: 'bg-emerald-50', darkText: 'text-emerald-700' },
  'cyan': { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-200', lightBg: 'bg-cyan-50', darkText: 'text-cyan-700' },
  'blue': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lightBg: 'bg-blue-50', darkText: 'text-blue-700' },
  'indigo': { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-200', lightBg: 'bg-indigo-50', darkText: 'text-indigo-700' },
  'violet': { bg: 'bg-violet-500', text: 'text-violet-500', border: 'border-violet-200', lightBg: 'bg-violet-50', darkText: 'text-violet-700' },
  'pink': { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-200', lightBg: 'bg-pink-50', darkText: 'text-pink-700' },
  'rose': { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', lightBg: 'bg-rose-50', darkText: 'text-rose-700' }
};

const AVAILABLE_COLORS = Object.keys(COLOR_VARIANTS);

const AVAILABLE_ICONS: Record<string, React.ElementType> = {
  Folder, FolderOpen, ImageIcon, Video, Music, FileText, 
  Archive, Code, Briefcase, Camera, Book, File, Globe, Key, Box, Heart, Zap, Shield, Database
};

const renderIcon = (iconName: string | undefined, colorKey: string | undefined, className: string) => {
  const colorObj = (colorKey && COLOR_VARIANTS[colorKey]) ? COLOR_VARIANTS[colorKey] : COLOR_VARIANTS['indigo'];
  if (iconName && AVAILABLE_ICONS[iconName]) {
    const IconComponent = AVAILABLE_ICONS[iconName];
    return <IconComponent className={`${className} ${colorObj.text}`} />;
  }
  // Default fallback if no icon but has color
  if (colorKey && COLOR_VARIANTS[colorKey]) {
    return <span className={`rounded-full flex-shrink-0 ${colorObj.bg} ${className.includes('w-') ? className.match(/w-\d+/)?.[0] : 'w-2'} ${className.includes('h-') ? className.match(/h-\d+/)?.[0] : 'h-2'}`}></span>;
  }
  // Default to small dot if nothing specified
  return <span className={`rounded-full flex-shrink-0 bg-indigo-500 ${className.includes('w-') ? className.match(/w-\d+/)?.[0] : 'w-2'} ${className.includes('h-') ? className.match(/h-\d+/)?.[0] : 'h-2'}`}></span>;
};

const ContainerSettingsModal = ({
  container,
  existingNames,
  onClose,
  onSave
}: {
  container: { id: string, name: string, color?: string, icon?: string },
  existingNames: string[],
  onClose: () => void,
  onSave: (updates: { name: string, color?: string, icon?: string }) => void
}) => {
  const [name, setName] = useState(container.name);
  const [color, setColor] = useState(container.color);
  const [icon, setIcon] = useState(container.icon);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío");
      return;
    }
    
    // Check for invalid characters (allow alphanumeric, spaces, dashes, underscores)
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      setError("El nombre solo puede contener letras, números, espacios, guiones y guiones bajos.");
      return;
    }
    
    if (existingNames.includes(trimmed.toLowerCase())) {
      setError("Ya existe un contenedor con este nombre");
      return;
    }
    onSave({ name: trimmed, color, icon });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card border border-border-lite p-6 rounded-xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Apariencia del Contenedor
          </h3>
          <button onClick={onClose} className="p-1 rounded-md text-text-secondary hover:bg-surface-pill transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-red-200">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-secondary flex items-center gap-2"><Type className="w-4 h-4"/> Nombre del Contenedor</label>
            <input
              type="text"
              className="w-full bg-surface-base border border-border-lite rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-secondary">Color</label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setColor(undefined)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform ${!color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-110'}`}
                title="Por defecto"
              >
                <div className="w-full h-full rounded-full bg-surface-pill border border-border-lite flex items-center justify-center">
                  <X className="w-4 h-4 text-text-secondary" />
                </div>
              </button>
              {AVAILABLE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${COLOR_VARIANTS[c].bg} ${color === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-surface-card scale-110 border-white' : 'border-black/10 dark:border-white/10 hover:scale-110'}`}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-secondary">Icono</label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              <button
                onClick={() => setIcon(undefined)}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-colors ${!icon ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-border-lite bg-surface-base hover:border-indigo-300 text-text-primary'}`}
                title="Ninguno"
              >
                <X className="w-5 h-5" />
              </button>
              {Object.entries(AVAILABLE_ICONS).map(([iconName, IconComponent]) => (
                <button
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-colors ${icon === iconName ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-border-lite bg-surface-base hover:border-indigo-300 text-text-primary'}`}
                  title={iconName}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-lite mt-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-text-secondary hover:bg-surface-pill transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailDroppableArea = ({ containerId, isTrash = false, headerRenderer, children }: { containerId: string, isTrash?: boolean, headerRenderer?: (isOver: boolean) => React.ReactNode, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `detail-${containerId}`,
    data: { type: 'detail-droppable', containerId }
  });
  return (
    <div ref={setNodeRef} className="flex-1 flex flex-col min-h-0 relative">
      {headerRenderer && headerRenderer(isOver)}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar transition-colors ${isOver ? (isTrash ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20') : 'bg-surface-base/30'}`}>
         {children}
      </div>
    </div>
  );
};

const GridDroppableArea = ({ containerId, isTrash = false, children }: { containerId: string, isTrash?: boolean, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${containerId}`,
    data: { type: 'grid-droppable', containerId }
  });
  return (
    <div ref={setNodeRef} className={`flex-1 overflow-y-auto space-y-2 fallback-scroll pr-1 p-2 rounded-xl transition-colors ${isOver ? (isTrash ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500 ring-inset scale-[1.01]' : 'bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-inset scale-[1.01]') : ''}`}>
      {children}
    </div>
  );
};

const FilePreviewModal = ({ fileEntry, name, onClose }: { fileEntry?: FileEntry, name: string, onClose: () => void }) => {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-surface-card p-0 rounded-2xl shadow-2xl max-w-5xl w-full max-h-screen flex flex-col border border-border-lite" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-border-lite bg-surface-base rounded-t-2xl">
          <span className="font-bold text-lg text-text-primary truncate pr-4">{name}</span>
          <button onClick={onClose} className="text-text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center bg-surface-base/30 rounded-b-2xl p-4 min-h-[50vh]">
          {isImage && (
            <>
              <div className="absolute top-6 right-6 flex items-center gap-1 z-10 bg-surface-card/90 backdrop-blur-md p-1.5 rounded-lg shadow-lg border border-border-lite">
                <button onClick={zoomOut} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-mono w-10 text-center select-none">{Math.round(scale * 100)}%</span>
                <button onClick={zoomIn} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary"><ZoomIn className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-border-mute mx-1"></div>
                <button onClick={resetZoom} className="p-1.5 hover:bg-surface-base rounded-md text-text-secondary hover:text-text-primary"><Maximize className="w-4 h-4" /></button>
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
      </div>
    </div>,
    document.body
  );
};

const FileItem = ({ 
  file, id, containerId, fileEntry, isSelected = false, isGroupDragging = false, onClick, onFavoriteToggle, onDoubleClick, dropFeedback, index
}: { 
  key?: React.Key; file: string; id: string; containerId: string; fileEntry?: FileEntry;
  isSelected?: boolean; isGroupDragging?: boolean; onClick?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onFavoriteToggle?: () => void;
  onDoubleClick?: (e: React.MouseEvent, id: string) => void;
  dropFeedback?: 'success-normal' | 'success-trash' | 'abort';
  index?: number;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    return localStorage.getItem(`favorite-${id}`) === 'true';
  });

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorite = !isFavorite;
    setIsFavorite(newFavorite);
    if (newFavorite) {
      localStorage.setItem(`favorite-${id}`, 'true');
    } else {
      localStorage.removeItem(`favorite-${id}`);
    }
    if (onFavoriteToggle) onFavoriteToggle();
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { file, containerId }
  });

  const actualDragging = isDragging || isGroupDragging;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const parts = file.split('/');
  const name = parts[parts.length - 1];

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

  const canPreview = isImage || isVideo || isAudio || isText;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={(e) => onClick?.(e, id)}
        onDoubleClick={(e) => onDoubleClick?.(e, id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(e as any, id);
          }
        }}
        tabIndex={0}
        data-file-id={id}
        data-file-index={index}
        data-is-file="true"
        className={`item-pill flex flex-col rounded-lg px-3 py-2 text-xs font-medium text-text-primary overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500
          ${dropFeedback === 'success-normal' ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-md' :
            dropFeedback === 'success-trash' ? 'ring-2 ring-inset ring-red-500 bg-red-50 dark:bg-red-900/10 shadow-md' :
            dropFeedback === 'abort' ? 'ring-2 ring-inset ring-gray-600 dark:ring-gray-400 bg-gray-50 dark:bg-gray-800 shadow-md' :
            actualDragging ? 'opacity-50 ring-2 ring-dashed ring-inset ring-indigo-400 bg-indigo-500/5 shadow-inner scale-[0.98]' : 
            isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md' : 
            'opacity-100 shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:ring-indigo-300 hover:shadow-md'}`}
        title={file}
      >
        <div className="w-full flex items-center justify-between gap-1">
          <div {...listeners} {...attributes} className="flex-1 truncate outline-none self-stretch flex items-center">
            <span className={`truncate ${isFavorite ? 'text-amber-500 font-semibold' : ''}`}>{name}</span>
          </div>
          <div className="flex items-center">
            <button
              className={`p-1.5 rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isFavorite ? 'text-amber-500 hover:bg-amber-50/10' : 'text-text-secondary hover:text-amber-500 hover:bg-surface-base'}`}
              onClick={toggleFavorite}
              title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
              aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Star className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-surface-base rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.share) {
                  navigator.share({
                    title: name,
                    text: `Mira este archivo: ${name}`,
                  }).catch(err => console.error('Error sharing:', err));
                } else {
                  alert(`Opciones de compartir para: ${name}`);
                }
              }}
              title="Compartir"
              aria-label="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {canPreview && !isImage && (
              <button
                className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-surface-base rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                title="Previsualizar"
                aria-label="Previsualizar"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {previewUrl && (
          <div className="group relative mt-2 w-full h-20 bg-surface-base rounded-md flex items-center justify-center overflow-hidden border border-border-lite border-opacity-50 outline-none">
            <img src={previewUrl} alt={name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
            <button
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
              className="absolute inset-0 w-full h-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
              aria-label={`Previsualizar ${name}`}
            >
              <Search className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6" />
            </button>
            <div {...listeners} {...attributes} className="absolute inset-0 z-[-1]"></div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <FilePreviewModal
          fileEntry={fileEntry}
          name={name}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

const ContainerColumn = ({ existingNames = [], id, name, color, icon, files, scannedFiles, onUpdateContainer, onCustomizeContainer, isExpanded = true, onToggleExpand, isTrash = false, onTrashAction, onSort, onDeleteContainer,
  selectedFiles = new Set(), activeId = null, onFileClick, onFavoriteToggle, onDoubleClickFile, onSelectAll, onDeselectAll, fileDropFeedback = {}, requestConfirm
}: { 
  key?: React.Key; id: string; name: string; color?: string; icon?: string; files: string[]; scannedFiles: FileEntry[]; onUpdateContainer: (id: string, updates: {name?: string, color?: string, icon?: string}) => void;
  onCustomizeContainer?: (id: string) => void;
  isExpanded?: boolean; onToggleExpand?: () => void; isTrash?: boolean; onTrashAction?: (action: 'delete' | 'restore', files: string[]) => void;
  onSort?: (id: string) => void; onDeleteContainer?: (id: string, files: string[]) => void;
  selectedFiles?: Set<string>; activeId?: string | null; onFileClick?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onFavoriteToggle?: () => void; onDoubleClickFile?: (e: React.MouseEvent, fileId: string) => void;
  onSelectAll?: (files: string[]) => void; onDeselectAll?: (files: string[]) => void;
  fileDropFeedback?: Record<string, 'success-normal' | 'success-trash' | 'abort'>;
  requestConfirm?: (msg: string, onConfirm: () => void) => void;
  existingNames?: string[];
}) => {
  const { 
    setNodeRef, 
    isOver, 
    transform, 
    transition, 
    attributes, 
    listeners,
    isDragging 
  } = useSortable({ 
    id, 
    data: { type: 'container-list-item', containerId: id } 
  });

  const doConfirm = (msg: string, action: () => void) => {
    if (requestConfirm) {
      requestConfirm(msg, action);
    } else if (window.confirm(msg)) {
      action();
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const containerSelectedFiles = files.filter(f => selectedFiles.has(f));
  const isAllSelected = files.length > 0 && containerSelectedFiles.length === files.length;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      alert("El nombre del contenedor no puede estar vacío.");
      setEditName(name); // Reset to original
      setIsEditing(false);
      return;
    }
    
    // Check for invalid characters (allow alphanumeric, spaces, dashes, underscores)
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      alert("El nombre contiene caracteres especiales no permitidos. Solo se admiten letras, números, espacios, guiones y guiones bajos.");
      setEditName(name); // Reset to original
      setIsEditing(false);
      return;
    }

    if (existingNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Ya existe un contenedor con el nombre "${trimmed}".`);
      setEditName(name); // Reset to original
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    if (trimmed !== name) {
      onUpdateContainer(id, { name: trimmed });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(name);
    }
  };

  const toggleSelection = () => {
    if (isAllSelected) {
      onDeselectAll?.(files);
    } else {
      onSelectAll?.(files);
    }
  };

  const handleDeleteSelected = () => {
    if (containerSelectedFiles.length > 0 && onTrashAction) {
      doConfirm(`¿Eliminar permanentemente ${containerSelectedFiles.length} archivo(s)?`, () => {
        onTrashAction('delete', containerSelectedFiles);
      });
    }
  };

  const handleRestoreSelected = () => {
    if (containerSelectedFiles.length > 0 && onTrashAction) {
      onTrashAction('restore', containerSelectedFiles);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`container-card flex flex-col rounded-2xl p-5 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:ring-2 hover:ring-indigo-400/50 
        ${isOver ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 scale-[1.02] shadow-lg border-transparent' : ''}
        ${isExpanded ? 'min-w-[300px] max-w-[350px] flex-1 h-[70vh]' : 'min-w-[140px] max-w-[140px] h-[70vh] items-center justify-start'}
        ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className={`flex items-center justify-between border-border-lite ${isExpanded ? 'mb-4 border-b pb-3 w-full' : 'mb-2 flex-col gap-2 rotate-180'} select-none`} style={!isExpanded ? { writingMode: 'vertical-rl' } : {}}>
        <div 
          className="flex items-center w-full touch-none cursor-grab active:cursor-grabbing" 
          {...attributes}
          {...listeners}
        >
          <div onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }} className="cursor-pointer mr-1">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-text-secondary hover:text-indigo-500 transition-colors" />
            ) : (
              <ChevronRight className="w-5 h-5 text-text-secondary mb-2 hover:text-indigo-500 transition-colors rotate-90" />
            )}
          </div>
          <h3 className={`flex items-center font-bold text-text-primary ${isExpanded ? 'flex-1 min-w-0 mr-2' : ''}`}>
            {isTrash ? (
              <Trash2 className={`flex-shrink-0 text-red-500 ${isExpanded ? 'mr-2 w-5 h-5' : 'mb-2 w-6 h-6 rotate-90'}`} />
            ) : (
              renderIcon(icon, color, isExpanded ? 'mr-2 w-5 h-5' : 'mb-2 w-6 h-6')
            )}
            
            {isEditing && isExpanded && !isTrash ? (
              <input
                ref={inputRef}
                type="text"
                className="flex-1 min-w-0 bg-surface-base border border-indigo-500 rounded px-2 py-0.5 text-sm outline-none w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
                aria-label="Renombrar contenedor"
              />
            ) : (
              <span 
                className={`container-header-interactive truncate focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isExpanded ? 'cursor-text hover:bg-black/5 dark:hover:bg-white/5 py-0.5 px-1 rounded -ml-1 transition-colors' : 'text-lg overflow-visible tracking-widest rotate-180'}`}
                tabIndex={(isExpanded && !isTrash) || isTrash ? 0 : undefined}
                role={(isExpanded && !isTrash) || isTrash ? "button" : undefined}
                aria-label={isExpanded && !isTrash ? `Renombrar contenedor ${name}` : name}
                data-container-id={id}
                onClick={(e) => {
                  if (isExpanded && !isTrash) {
                    e.stopPropagation();
                    setIsEditing(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (isExpanded && !isTrash && (e.key === 'Enter' || e.key === ' ')) {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsEditing(true);
                  }
                }}
                title={isExpanded && !isTrash ? "Click para renombrar" : name}
              >
                {name}
              </span>
            )}
          </h3>
        </div>
        <span className={`font-medium font-mono flex-shrink-0 ${isExpanded ? 'text-xs text-text-secondary' : 'text-sm text-indigo-500 mt-2 rotate-90'}`}>
          [{files.length}]
        </span>
      </div>

      {isExpanded && (
        <>
          {isTrash && files.length > 0 && (
            <div className="flex items-center justify-between mb-3 text-xs border-b border-border-lite pb-2">
              <button 
                onClick={toggleSelection} 
                className="flex items-center text-text-secondary hover:text-indigo-600 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 -ml-1"
                title="Seleccionar todo"
                aria-label={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
              >
                {isAllSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                Todo
              </button>
              {containerSelectedFiles.length > 0 ? (
                <div className="flex items-center gap-2">
                  <button onClick={handleRestoreSelected} className="flex items-center text-emerald-600 hover:text-emerald-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-1" title="Restaurar seleccionados" aria-label="Restaurar seleccionados">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={handleDeleteSelected} className="flex items-center text-red-600 hover:text-red-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1" title="Eliminar permanentemente los seleccionados" aria-label="Eliminar permanentemente los seleccionados">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    if (onTrashAction) {
                      doConfirm('¿Eliminar todos los archivos de la papelera permanentemente?', () => {
                        onTrashAction('delete', files);
                      });
                    }
                  }} 
                  className="flex items-center justify-center flex-1 ml-2 bg-red-500 text-white hover:bg-red-600 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-2"
                  aria-label="Vaciar papelera"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Vaciar Todo
                </button>
              )}
            </div>
          )}
          {!isTrash && (
            <div className="flex justify-between mb-2 gap-2 text-text-secondary">
              {files.length > 0 ? (
                <button 
                  onClick={toggleSelection} 
                  className="flex items-center text-xs text-text-secondary hover:text-indigo-600 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 -ml-1"
                  title="Seleccionar todo"
                  aria-label={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                >
                  {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 mr-1" /> : <Square className="w-3.5 h-3.5 mr-1" />}
                  Todo
                </button>
              ) : <div />}
              <div className="flex items-center gap-1">
                {typeof onCustomizeContainer === 'function' && (
                  <button 
                    onClick={() => onCustomizeContainer(id)}
                    className="flex items-center text-xs hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
                    title="Configurar contenedor"
                    aria-label="Configurar contenedor"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Color/Icono
                  </button>
                )}
                {files.length > 0 && typeof onSort === 'function' && (
                  <button 
                    onClick={() => onSort(id)}
                    className="flex items-center text-xs hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
                    title="Ordenar alfabéticamente"
                    aria-label="Ordenar alfabéticamente"
                  >
                    <ArrowDownAZ className="w-4 h-4 mr-1" />
                    Ordenar
                  </button>
                )}
                {id.startsWith('custom-') && typeof onDeleteContainer === 'function' && files.length === 0 && (
                   <button 
                    onClick={() => {
                      doConfirm(`¿Estás seguro de que deseas eliminar el contenedor "${name}"?`, () => {
                        if (onDeleteContainer) onDeleteContainer(id, files);
                      });
                    }}
                    className="flex items-center text-xs hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1"
                    title="Eliminar este contenedor"
                    aria-label={`Eliminar contenedor ${name}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          )}
          <GridDroppableArea containerId={id} isTrash={isTrash}>
            {files.map((file, fileIdx) => (
              <div key={file} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <FileItem 
                    id={file} 
                    file={file} 
                    containerId={id} 
                    index={fileIdx}
                    fileEntry={scannedFiles.find(sf => sf.path === file)} 
                    isSelected={selectedFiles.has(file)}
                    isGroupDragging={activeId !== null && selectedFiles.has(activeId) && selectedFiles.has(file)}
                    onClick={onFileClick}
                    onFavoriteToggle={onFavoriteToggle}
                    onDoubleClick={onDoubleClickFile}
                    dropFeedback={fileDropFeedback[file]}
                  />
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm italic border-2 border-dashed border-border-lite rounded-lg bg-surface-base/50 p-6">
                Soltar aquí...
              </div>
            )}
          </GridDroppableArea>
        </>
      )}
    </div>
  );
};

const PreviewTooltip = ({ file }: { file: any }) => {
  const isImage = file.extension && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(file.extension.toLowerCase());
  const previewUrl = useMemo(() => {
    if (isImage && file.fileEntry?.fileObject) {
      return getImagePreview(file.fileEntry.fileObject);
    }
    return '';
  }, [file.fileEntry, isImage]);

  return (
    <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-surface-card border border-border-lite shadow-xl rounded-lg p-3 min-w-[200px] max-w-sm pointer-events-none fade-in">
      <div className="text-sm font-semibold text-text-primary mb-1 truncate">{file.name}</div>
      <div className="text-xs text-text-secondary mb-2 break-all line-clamp-2" title={file.path}>Ruta: {file.path}</div>
      <div className="text-xs text-text-secondary mb-2">Modificado: {file.lastModified ? new Date(file.lastModified).toLocaleString() : 'N/A'}</div>
      {previewUrl && (
        <img src={previewUrl} alt="Preview" className="w-full max-h-32 object-contain bg-surface-base rounded border border-border-lite" />
      )}
    </div>
  );
};

const SplitMasterItem = ({
  id, name, color, icon, fileCount, isTrash, isFocused, onHover, onClick
}: {
  key?: React.Key, id: string, name: string, color?: string, icon?: string, fileCount: number, isTrash: boolean, isFocused: boolean, onHover: () => void, onClick: () => void
}) => {
  const { setNodeRef, isOver, transform, transition, attributes, listeners, isDragging } = useSortable({
    id, data: { type: 'container-list-item', containerId: id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} style={style}
      onMouseEnter={onHover}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      tabIndex={0}
      data-container-id={id}
      className={`
        flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
        ${isOver ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 scale-[1.02] border-transparent' : (isFocused ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 ring-1 ring-indigo-400' : 'bg-surface-card hover:bg-surface-base border-border-lite border')}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        container-header-interactive
      `}
    >
      <div className="flex flex-1 items-center gap-3 overflow-hidden outline-none touch-none" {...attributes} {...listeners}>
         {isTrash ? <Trash2 className={`w-4 h-4 shrink-0 ${isFocused ? 'text-red-500' : 'text-red-400'}`} /> : renderIcon(icon, color, 'w-4 h-4')}
         <span className={`font-semibold truncate text-sm select-none text-text-primary`}>{name}</span>
      </div>
      <span className={`text-xs font-mono w-8 text-right shrink-0 select-none text-text-secondary`}>[{fileCount}]</span>
    </div>
  );
};

const ListViewTable = ({ containers, scannedFiles }: { containers: { id: string, name: string, color?: string, icon?: string, files: string[] }[], scannedFiles: FileEntry[] }) => {
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'container' | 'extension' | 'date', direction: 'asc' | 'desc' } | null>(null);
  const [listSearchTerm, setListSearchTerm] = useState('');

  const flatFiles = useMemo(() => {
    const list: { path: string, name: string, container: string, color?: string, icon?: string, extension: string, lastModified: number, fileEntry?: FileEntry }[] = [];
    containers.forEach(c => {
      c.files.forEach(fPath => {
        const entry = scannedFiles.find(sf => sf.path === fPath);
        const nameParts = fPath.split('/');
        const name = nameParts[nameParts.length - 1];
        list.push({
          path: fPath,
          name: name,
          container: c.name,
          color: c.color,
          icon: c.icon,
          extension: entry?.extension || '',
          lastModified: entry?.lastModified || 0,
          fileEntry: entry
        });
      });
    });
    return list;
  }, [containers, scannedFiles]);

  const filteredFiles = useMemo(() => {
    let result = flatFiles;
    if (listSearchTerm.trim()) {
      const term = listSearchTerm.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(term) ||
        f.container.toLowerCase().includes(term) ||
        f.extension.toLowerCase().includes(term)
      );
    }
    return result;
  }, [flatFiles, listSearchTerm]);

  const sortedFiles = useMemo(() => {
    let sortableItems = [...filteredFiles];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredFiles, sortConfig]);

  const requestSort = (key: 'name' | 'container' | 'extension' | 'date') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full h-full bg-surface-card rounded-2xl shadow-sm border border-border-lite overflow-hidden flex flex-col">
      <div className="p-3 border-b border-border-lite bg-surface-base flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Filtrar tabla..."
            value={listSearchTerm}
            onChange={(e) => setListSearchTerm(e.target.value)}
            className="w-full bg-surface-card border border-border-lite pl-9 pr-8 py-1.5 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filtrar tabla"
          />
          {listSearchTerm && (
            <button 
              onClick={() => setListSearchTerm('')} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              aria-label="Limpiar filtro"
              title="Limpiar filtro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-lite bg-surface-base sticky top-0 z-10">
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-1">Archivo <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('container')}>
                <div className="flex items-center gap-1">Contenedor <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('extension')}>
                <div className="flex items-center gap-1">Tipo <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('date')}>
                <div className="flex items-center gap-1">Modificado <ArrowUpDown className="w-3 h-3" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {sortedFiles.map((f, i) => (
              <tr key={i} className="border-b border-border-lite hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <td className="p-3 font-medium text-text-primary relative">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px] md:max-w-xs">{f.name}</span>
                  </div>
                  <PreviewTooltip file={f} />
                </td>
                <td className="p-3 text-text-secondary">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${(f.color && COLOR_VARIANTS[f.color]) ? COLOR_VARIANTS[f.color].border : 'border-indigo-200'} ${(f.color && COLOR_VARIANTS[f.color]) ? COLOR_VARIANTS[f.color].lightBg : 'bg-indigo-50'} ${(f.color && COLOR_VARIANTS[f.color]) ? COLOR_VARIANTS[f.color].darkText : 'text-indigo-700'} dark:bg-opacity-20`}>
                    {renderIcon(f.icon, f.color, 'w-3 h-3')}
                    {f.container}
                  </span>
                </td>
                <td className="p-3 text-text-secondary uppercase text-xs">{f.extension || 'Desc'}</td>
                <td className="p-3 text-text-secondary text-xs">
                  {f.lastModified ? new Date(f.lastModified).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
            {sortedFiles.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-text-secondary">
                  No hay archivos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'input' | 'scanning' | 'classifying' | 'editor'>('input');
  const [viewMode, setViewMode] = useState<'grid' | 'columns' | 'list'>('grid');
  const [folderName, setFolderName] = useState('');
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [scannedFiles, setScannedFiles] = useState<FileEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [focusedContainerId, setFocusedContainerId] = useState<string | null>(null);
  const [customizeContainerId, setCustomizeContainerId] = useState<string | null>(null);
  const [trashOriginalLocations, setTrashOriginalLocations] = useState<Record<string, string>>({}); // 'all', 'executable', 'directory', 'image', 'document'
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSavingToDisk, setIsSavingToDisk] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEnvironmentReal, setIsEnvironmentReal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const intervalRef = useRef<any>(null);
  const [favoritesTick, setFavoritesTick] = useState(0);

  const [editingFocusedContainerId, setEditingFocusedContainerId] = useState<string | null>(null);
  const [focusedContainerEditName, setFocusedContainerEditName] = useState('');
  const focusedInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<ClassificationResult[]>([]);
  const [future, setFuture] = useState<ClassificationResult[]>([]);
  const [recentAction, setRecentAction] = useState<{ message: string, timestamp: number, type?: 'undo' | 'normal' } | null>(null);

  useEffect(() => {
    if (recentAction) {
       const timer = setTimeout(() => setRecentAction(null), 5000);
       return () => clearTimeout(timer);
    }
  }, [recentAction]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; message: string; onConfirm: () => void;}>({ isOpen: false, message: '', onConfirm: () => {} });

  const requireConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  useEffect(() => {
    getKey('smartfolder_sessions').then((sessions: any) => {
      if (sessions && Array.isArray(sessions)) {
        setSavedSessions(sessions.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        // Fallback for previous single session
        getKey('smartfolder_session').then((legacySession: any) => {
          if (legacySession && legacySession.folderName) {
            setSavedSessions([legacySession]);
          }
        }).catch(() => {});
      }
    }).catch(err => console.log('No saved sessions', err));
  }, []);

  useEffect(() => {
    if (step === 'editor' && classification && dirHandle && folderName) {
      getKey('smartfolder_sessions').then((sessions: any) => {
        let currentSessions = Array.isArray(sessions) ? sessions : [];
        // Remove existing session for the same folder
        currentSessions = currentSessions.filter((s: any) => s.folderName !== folderName);
        
        const newSession = { folderName, dirHandle, classification, timestamp: Date.now() };
        currentSessions.unshift(newSession);
        // Keep only top 5 recent sessions
        currentSessions = currentSessions.slice(0, 5);
        
        setKey('smartfolder_sessions', currentSessions).catch(err => console.error('Error saving session:', err));
        setSavedSessions(currentSessions);
      });
    }
  }, [step, classification, dirHandle, folderName]);

  const commitClassificationChange = (
    updater: ClassificationResult | ((prev: ClassificationResult | null) => ClassificationResult | null),
    actionDesc?: string
  ) => {
    setClassification(prev => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      if (prev && nextState && JSON.stringify(prev) !== JSON.stringify(nextState)) {
        setHistory(h => [...h, prev].slice(-30));
        setFuture([]);
        setIsDirty(true);
        if (actionDesc) {
           setRecentAction({ message: actionDesc, timestamp: Date.now() });
        }
      }
      return nextState;
    });
  };

  const handleUndo = React.useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setClassification(current => {
      if (current) setFuture(f => [current, ...f]);
      return previousState;
    });
    setRecentAction({ message: 'Acción deshecha', timestamp: Date.now(), type: 'undo' });
  }, [history]);

  const handleRedo = React.useCallback(() => {
    if (future.length === 0) return;
    const nextState = future[0];
    setFuture(f => f.slice(1));
    setClassification(current => {
      if (current) setHistory(h => [...h, current].slice(-30));
      return nextState;
    });
    setRecentAction({ message: 'Acción rehecha', timestamp: Date.now(), type: 'normal' });
  }, [future]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Keyboard navigation logic
      const isGridMode = !!document.querySelector('[data-files-grid]');
      if (isGridMode && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeElem = document.activeElement as HTMLElement;
        if (!activeElem) return;

        const isContainer = activeElem.hasAttribute('data-container-id') && !activeElem.hasAttribute('data-is-file');
        const isFile = activeElem.hasAttribute('data-is-file');

        if (isContainer) {
          const containers = Array.from(document.querySelectorAll('.container-header-interactive[data-container-id]:not([data-is-file])')) as HTMLElement[];
          const currentIndex = containers.indexOf(activeElem);
          if (currentIndex !== -1) {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const next = containers[Math.max(0, currentIndex - 1)];
              if (next) { next.focus(); next.click(); }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = containers[Math.min(containers.length - 1, currentIndex + 1)];
              if (next) { next.focus(); next.click(); }
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const firstFile = document.querySelector('[data-files-grid] [data-is-file]') as HTMLElement;
              if (firstFile) {
                firstFile.focus();
              }
            }
          }
        } else if (isFile) {
          const files = Array.from(document.querySelectorAll('[data-files-grid] [data-is-file]')) as HTMLElement[];
          const currentIndex = files.indexOf(activeElem);
          if (currentIndex !== -1) {
            let cols = 1;
            if (files.length > 1) {
              if (Math.abs(files[0].offsetTop - files[1].offsetTop) < 10) {
                cols = 2;
              }
            }
            
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              if (currentIndex % cols === 0) {
                const containerId = activeElem.getAttribute('data-container-id');
                const containerElem = document.querySelector(`.container-header-interactive[data-container-id="${containerId}"]:not([data-is-file])`) as HTMLElement;
                if (containerElem) containerElem.focus();
              } else {
                const next = files[currentIndex - 1];
                if (next) next.focus();
              }
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const next = files[currentIndex + 1];
              if (next) next.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              let nextIdx = currentIndex - cols;
              if (nextIdx < 0) {
                const containerId = activeElem.getAttribute('data-container-id');
                const containerElem = document.querySelector(`.container-header-interactive[data-container-id="${containerId}"]:not([data-is-file])`) as HTMLElement;
                if (containerElem) containerElem.focus();
              } else {
                const next = files[nextIdx];
                if (next) next.focus();
              }
            } else if (e.key === 'ArrowDown') {
               e.preventDefault();
               const next = files[currentIndex + cols];
               if (next) next.focus();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleFileClick = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (e && 'shiftKey' in e && e.shiftKey) {
        next.add(id);
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  };

  const handleFileDoubleClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      const fileEntry = scannedFiles.find(sf => sf.path === path);
      if (fileEntry && fileEntry.fileObject) {
        const url = URL.createObjectURL(fileEntry.fileObject);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileEntry.fileObject.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleFavoriteToggle = () => {
    setFavoritesTick(prev => prev + 1);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const handleFallbackSelectFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setStep('scanning');
    
    try {
      const { entries, rootName } = processFileList(e.target.files);
      setFolderName(rootName);
      setDirHandle(null);
      setScannedFiles(entries);
      
      if (entries.length === 0) {
        setErrorMsg('La carpeta seleccionada parece estar vacía.');
        setStep('input');
        return;
      }
      
      const cappedFiles = entries.slice(0, 2000);
      setStep('classifying');
      const result = await classifyFiles(cappedFiles);
      if (!result.containers.find((c: any) => c.id === 'trash')) {
        result.containers.push({ id: 'trash', name: 'Papelera', files: [] });
      }
      setClassification(result);
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (err: any) {
       console.error(err);
       setErrorMsg('Ocurrió un error al procesar los archivos.');
       setStep('input');
    }
  };

  const handleResumeSession = async (session: any) => {
    try {
      setStep('scanning');
      const handle = session.dirHandle;
      if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
        const permission = await handle.requestPermission({ mode: 'read' });
        if (permission !== 'granted') {
          throw new Error('Permisos denegados.');
        }
      }
      setDirHandle(handle);
      setFolderName(session.folderName);
      
      const filesDesc = await scanDirectory(handle);
      setScannedFiles(filesDesc);
      
      // Smart sync: find out what was added and deleted on disk since last session
      const currentPaths = new Set(filesDesc.map(f => f.path));
      const savedPaths = new Set<string>();
      
      session.classification.containers.forEach((c: any) => {
        c.files.forEach((f: string) => savedPaths.add(f));
      });

      const newFiles = filesDesc.filter(f => !savedPaths.has(f.path));
      
      let updatedContainers = session.classification.containers.map((c: any) => ({
        ...c,
        files: c.files.filter((f: string) => currentPaths.has(f)) // remove deleted files
      }));

      // Classify only new files and merge them
      if (newFiles.length > 0) {
        const newClassification = await classifyFiles(newFiles);
        newClassification.containers.forEach((nc: any) => {
          if (nc.files.length === 0) return;
          const existRegex = new RegExp(`^${nc.name}$`, 'i');
          const existing = updatedContainers.find((c: any) => existRegex.test(c.name));
          if (existing) {
            existing.files.push(...nc.files);
          } else {
            updatedContainers.push({
              ...nc,
              id: `merged-${Date.now()}-${nc.id}`
            });
          }
        });
      }

      setClassification({
        ...session.classification,
        containers: updatedContainers
      });
      
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (e) {
      console.error(e);
      setErrorMsg(`No se pudo restaurar la sesión para "${session.folderName}". Verifica permisos o que la carpeta siga existiendo.`);
      setStep('input');
      
      // Removed failed session from list
      const updatedSessions = savedSessions.filter(s => s.folderName !== session.folderName);
      setSavedSessions(updatedSessions);
      setKey('smartfolder_sessions', updatedSessions);
    }
  };

  const handleSelectFolder = async () => {
    setErrorMsg('');

    if (!('showDirectoryPicker' in window)) {
      fileInputRef.current?.click();
      return;
    }

    try {
      // Prompt user to select directory
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      setFolderName(handle.name);
      setStep('scanning');

      // Scan directory
      const filesDesc = await scanDirectory(handle);
      setScannedFiles(filesDesc);
      
      if (filesDesc.length === 0) {
        setErrorMsg('La carpeta seleccionada parece estar vacía.');
        setStep('input');
        return;
      }
      
      // Ahora que es totalmente local, procesar 2000 elementos no es problema
      const cappedFiles = filesDesc.slice(0, 2000);

      setStep('classifying');
      
      // Classify locally
      const result = await classifyFiles(cappedFiles);
      if (!result.containers.find((c: any) => c.id === 'trash')) {
        result.containers.push({ id: 'trash', name: 'Papelera', files: [] });
      }
      setClassification(result);
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        // User cancelled, do nothing
        setStep('input');
      } else {
        setErrorMsg('Error accediendo a la carpeta. Asegúrate de usar un navegador compatible (ej. Chrome o Edge).');
        setStep('input');
      }
    }
  };

  const handleUpdateContainer = (id: string, updates: { name?: string, color?: string, icon?: string }) => {
    commitClassificationChange(prev => {
      if (!prev) return prev;
      const newContainers = prev.containers.map(c => 
        c.id === id ? { ...c, ...updates } : c
      );
      return { ...prev, containers: newContainers };
    }, `Contenedor actualizado`);
  };

  const handleDeleteContainer = (id: string, filesToTrash: string[]) => {
    commitClassificationChange(prev => {
      if (!prev) return prev;
      let newContainers = prev.containers.filter(c => c.id !== id);
      
      const trashIdx = newContainers.findIndex(c => c.id === 'trash');
      if (trashIdx !== -1 && filesToTrash.length > 0) {
        newContainers[trashIdx] = {
          ...newContainers[trashIdx],
          files: [...newContainers[trashIdx].files, ...filesToTrash]
        };
      }
      
      return { ...prev, containers: newContainers };
    }, filesToTrash.length > 0 ? `Contenedor eliminado y ${filesToTrash.length} archivo(s) a la papelera` : 'Contenedor eliminado');

    if (filesToTrash.length > 0) {
      setTrashOriginalLocations(prev => {
         const next = { ...prev };
         filesToTrash.forEach(f => {
           // We can't easily jump back to a deleted container, so let's default to no location
           delete next[f];
         });
         return next;
      });
    }

    setExpandedContainers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (filesToSelect: string[]) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      filesToSelect.forEach(f => next.add(f));
      return next;
    });
  };

  const handleDeselectAll = (filesToDeselect: string[]) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      filesToDeselect.forEach(f => next.delete(f));
      return next;
    });
  };

  const handleTrashAction = (action: 'delete' | 'restore', filesToProcess: string[]) => {
    commitClassificationChange(prev => {
      if (!prev) return prev;
      let newContainers = [...prev.containers];
      const trashIndex = newContainers.findIndex(c => c.id === 'trash');
      if (trashIndex === -1) return prev;

      if (action === 'delete') {
        newContainers[trashIndex] = {
          ...newContainers[trashIndex],
          files: newContainers[trashIndex].files.filter(f => !filesToProcess.includes(f))
        };
      } else if (action === 'restore') {
        let currentTrashFiles = [...newContainers[trashIndex].files];
        filesToProcess.forEach(filePaths => {
          const originalContainerId = trashOriginalLocations[filePaths];
          const targetId = originalContainerId || 'otros'; // fallback original or 'otros'
          let targetIndex = newContainers.findIndex(c => c.id === targetId);
          if (targetIndex === -1) {
             const otrosContainer = { id: 'otros', name: 'Otros', files: [] };
             const tIdx = newContainers.findIndex(c => c.id === 'trash');
             if (tIdx !== -1) {
                newContainers.splice(tIdx, 0, otrosContainer);
                targetIndex = tIdx;
             } else {
                newContainers.push(otrosContainer);
                targetIndex = newContainers.length - 1;
             }
          }
          newContainers[targetIndex] = {
            ...newContainers[targetIndex],
            files: [...newContainers[targetIndex].files, filePaths]
          };
          currentTrashFiles = currentTrashFiles.filter(f => f !== filePaths);
        });
        newContainers[trashIndex] = {
          ...newContainers[trashIndex],
          files: currentTrashFiles
        };
      }
      return { containers: newContainers };
    }, action === 'delete' ? `Eliminado(s) ${filesToProcess.length} archivo(s)` : `Restaurado(s) ${filesToProcess.length} archivo(s)`);
    
    if (action === 'delete') {
       setScannedFiles(prev => prev.filter(f => !filesToProcess.includes(f.path)));
    }
  };

  const toggleContainerExpand = (id: string) => {
    setExpandedContainers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (classification) {
      setExpandedContainers(new Set(classification.containers.map(c => c.id)));
      setViewMode('columns');
    }
  };

  const collapseAll = () => {
    setExpandedContainers(new Set());
    setViewMode('grid');
  };

  const addEmptyContainer = () => {
    commitClassificationChange(prev => {
      if (!prev) return prev;
      const newId = `custom-${Date.now()}`;
      const newContainer = { id: newId, name: 'Nuevo Contenedor', files: [] };
      const newContainers = [...prev.containers];
      // Insert before trash if exists
      const trashIdx = newContainers.findIndex(c => c.id === 'trash');
      if (trashIdx !== -1) {
        newContainers.splice(trashIdx, 0, newContainer);
      } else {
        newContainers.push(newContainer);
      }
      setExpandedContainers(prevExpanded => new Set(prevExpanded).add(newId));
      return { ...prev, containers: newContainers };
    }, 'Nuevo contenedor agregado');
  };

  const sortContainer = (id: string) => {
    commitClassificationChange(prev => {
      if (!prev) return prev;
      const newContainers = [...prev.containers];
      const idx = newContainers.findIndex(c => c.id === id);
      if (idx !== -1) {
        newContainers[idx] = {
          ...newContainers[idx],
          files: [...newContainers[idx].files].sort((a, b) => {
            const nameA = a.split('/').pop() || '';
            const nameB = b.split('/').pop() || '';
            return nameA.localeCompare(nameB);
          })
        };
      }
      return { ...prev, containers: newContainers };
    }, 'Contenedor ordenado alfabéticamente');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [fileDropFeedback, setFileDropFeedback] = useState<Record<string, 'success-normal' | 'success-trash' | 'abort'>>({});

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    setActiveId(draggedId);
    
    // Ignore if dragging a container
    if (event.active.data.current?.type === 'container' || event.active.data.current?.type === 'container-list-item') {
      return;
    }

    // If dragging an unselected item, make it the only selected item
    if (!selectedFiles.has(draggedId)) {
      setSelectedFiles(new Set([draggedId]));
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    if (over && active.data.current?.type !== 'container' && active.data.current?.type !== 'container-list-item') {
      let overContainerId: string | undefined = undefined;
      
      if (over.data.current?.type === 'container' || over.data.current?.type === 'container-list-item' || over.data.current?.type === 'grid-droppable' || over.data.current?.type === 'detail-droppable') {
         overContainerId = over.data.current?.containerId as string | undefined;
      }
      
      if (!overContainerId) {
         if (over.id.toString().startsWith('detail-')) overContainerId = over.id.toString().replace('detail-', '');
         else if (over.id.toString().startsWith('grid-')) overContainerId = over.id.toString().replace('grid-', '');
         else overContainerId = over.id as string;
      }

      if (overContainerId && focusedContainerId !== overContainerId) {
         setFocusedContainerId(overContainerId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (active.data.current?.type === 'container' || active.data.current?.type === 'container-list-item') {
      if (!over || !classification) return;
      const activeId = active.id;
      const overId = over.id;

      if (activeId !== overId) {
        commitClassificationChange(prev => {
          if (!prev) return prev;
          const oldIndex = prev.containers.findIndex(c => c.id === activeId);
          const newIndex = prev.containers.findIndex(c => c.id === overId);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            return {
              ...prev,
              containers: arrayMove(prev.containers, oldIndex, newIndex)
            };
          }
          return prev;
        }, 'Contenedor reorganizado');
      }
      return;
    }

    const filesToMove: string[] = Array.from(selectedFiles);
    if (filesToMove.length === 0) return;

    let abort = false;
    let targetContainerId: string | null = null;

    if (!over || !classification) {
      abort = true;
    } else {
      if (over.data.current?.type === 'container-list-item' || over.data.current?.type === 'container') {
        abort = true;
      } else if (over.data.current?.type === 'grid-droppable' || over.data.current?.type === 'detail-droppable') {
        targetContainerId = over.data.current.containerId;
      }

      if (!targetContainerId) {
        abort = true;
      }
    }

    const originContainerId = classification?.containers.find(c => c.files.includes(filesToMove[0]))?.id;

    if (abort || (targetContainerId && targetContainerId === originContainerId)) {
      setFileDropFeedback(prev => {
        const next = { ...prev };
        filesToMove.forEach(id => { next[id] = 'abort'; });
        return next;
      });
      setTimeout(() => {
        setFileDropFeedback(prev => {
          const next = { ...prev };
          filesToMove.forEach(id => delete next[id]);
          return next;
        });
      }, 1000);
      
      if (originContainerId && focusedContainerId !== originContainerId) {
         setFocusedContainerId(originContainerId);
      }
      return;
    }

    // Success drop
    setFileDropFeedback(prev => {
      const next = { ...prev };
      filesToMove.forEach(id => { next[id] = targetContainerId === 'trash' ? 'success-trash' : 'success-normal'; });
      return next;
    });
    setTimeout(() => {
      setFileDropFeedback(prev => {
        const next = { ...prev };
        filesToMove.forEach(id => delete next[id]);
        return next;
      });
    }, 1000);

    commitClassificationChange(prev => {
      if (!prev) return prev;
      
      let newContainers = [...prev.containers];
      const targetIndex = newContainers.findIndex(c => c.id === targetContainerId);
      if (targetIndex === -1) return prev;

      filesToMove.forEach((fileId: string) => {
        const sourceIndex = newContainers.findIndex(c => c.files.includes(fileId));
        if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
            newContainers[sourceIndex] = {
               ...newContainers[sourceIndex],
               files: newContainers[sourceIndex].files.filter(f => f !== fileId)
            };
            newContainers[targetIndex] = {
               ...newContainers[targetIndex],
               files: [fileId, ...newContainers[targetIndex].files]
            };
        }
      });
      return { containers: newContainers };
    }, `Movido(s) ${filesToMove.length} archivo(s)` + (targetContainerId === 'trash' ? ' a la papelera' : ''));

    filesToMove.forEach((fileId: string) => {
      const sourceContainerId = classification?.containers.find(c => c.files.includes(fileId))?.id;
      if (sourceContainerId && sourceContainerId !== targetContainerId) {
        if (targetContainerId === 'trash') {
          setTrashOriginalLocations(prev => ({ ...prev, [fileId]: sourceContainerId }));
        } else if (sourceContainerId === 'trash') {
          setTrashOriginalLocations(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }
      }
    });
    
    setSelectedFiles(new Set());
  };

  const handleExport = async () => {
    if (!classification) return;
    const htmlStr = generateEnhancedHtmlString(folderName, classification);
    
    try {
      if (dirHandle) {
        // Tratar de guardar directamente en la carpeta para un funcionamiento perfecto
        const fileHandle = await dirHandle.getFileHandle(`Vista_Mejorada_${folderName}.html`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(htmlStr);
        await writable.close();
        
        alert(`✅ "Vista_Mejorada_${folderName}.html" se ha guardado exitosamente\ndentro de tu carpeta "${folderName}".\n\n¡Ve allí y haz doble clic en el archivo para abrir tu nueva interfaz!`);
        return; // Salir si tuvo éxito
      }
    } catch (e) {
      console.log('No se pudo guardar directamente en la carpeta, usando descarga normal.', e);
    }
    
    // Fallback: Descarga estándar del navegador
    const blob = new Blob([htmlStr], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vista_Mejorada_${folderName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`✅ Archivo descargado.\n\nIMPORTANTE: Para que los enlaces a tus documentos funcionen correctamente, debes mover este archivo descargado dentro de tu carpeta "${folderName}" local.`);
  };

  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleExportZip = async () => {
    if (!classification) return;
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      
      classification.containers.forEach(container => {
        if (container.id === 'trash') return; // Do not export trash

        const folder = zip.folder(container.name);
        if (!folder) return;

        container.files.forEach(fileId => {
          const fileEntry = scannedFiles.find(f => f.path === fileId);
          if (fileEntry && fileEntry.fileObject) {
            folder.file(fileEntry.name, fileEntry.fileObject);
          }
        });
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_organizado.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setRecentAction({ message: 'Archivos exportados como ZIP', timestamp: Date.now(), type: 'normal' });
    } catch (e) {
      console.error('Error al exportar ZIP:', e);
      alert('Hubo un error al exportar el archivo ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const startApplyingToDisk = async () => {
    if (!classification || !dirHandle) {
      alert("No se pudo aplicar los cambios porque no se seleccionó mediante selector de carpetas compatible.");
      return;
    }

    try {
      if ((await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          alert("Se requieren permisos de escritura para aplicar los cambios.");
          return;
        }
      }
    } catch (e: any) {
      alert("Error al solicitar permisos: " + e.message);
      return;
    }

    setCountdown(10);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(intervalRef.current);
          handleApplyToDisk();
          return null;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
  };

  const abortCountdown = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(null);
  };

  const handleApplyToDisk = async () => {
    const allCurrentFiles = new Set(classification!.containers.flatMap(c => c.files));
    const permanentlyDeletedFiles = scannedFiles.filter(f => f.kind === 'file' && !allCurrentFiles.has(f.path));

    const executeApply = async () => {
      setIsSavingToDisk(true);
      try {
        const count = await applyChangesToDisk(dirHandle!, classification!, scannedFiles);
        alert(`✅ ¡Éxito! Tu carpeta ha sido organizada correctamente y los cambios se han aplicado (${count} archivos procesados).`);
        setIsDirty(false);
        setIsEnvironmentReal(true);
        setTimeout(() => {
          setIsEnvironmentReal(false);
        }, 2000);
      } catch (error: any) {
        alert(`❌ Error al guardar en disco: ${error.message || 'Desconocido'}`);
        console.error(error);
      } finally {
        setIsSavingToDisk(false);
      }
    };

    if (permanentlyDeletedFiles.length > 0) {
      requireConfirm(`¡Atención! Has vaciado archivos de la papelera en el entorno virtual.\n\nHay ${permanentlyDeletedFiles.length} archivos que serán ELIMINADOS DEFINITIVAMENTE de tu disco duro.\n\n¿Estás seguro de que deseas continuar?`, executeApply);
    } else {
      executeApply();
    }
  };

  // Find the active file path for Overlay
  const activeFile = activeId ? activeId : '';
  const activeName = activeFile.split('/').pop();
  const draggingContainer = classification?.containers.find(c => c.id === activeId);

  const pieData = useMemo(() => {
    if (!classification) return [];
    
    const counts: Record<string, number> = {};
    classification.containers.forEach(c => {
      if (c.id === 'trash') return;
      c.files.forEach(f => {
        const entry = scannedFiles.find(sf => sf.path === f);
        const ext = (entry?.extension || 'otro').toLowerCase();
        counts[ext] = (counts[ext] || 0) + 1;
      });
    });

    const parsedData = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    if (parsedData.length > 8) {
      const main = parsedData.slice(0, 7);
      const othersValue = parsedData.slice(7).reduce((acc, curr) => acc + curr.value, 0);
      main.push({ name: 'otros', value: othersValue });
      return main;
    }
    return parsedData;
  }, [classification, scannedFiles]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b'];

  // Filter files based on search and type
  const filteredClassification = useMemo(() => {
    if (!classification) return null;

    const term = searchTerm.toLowerCase();

    return {
      containers: classification.containers.map(c => {
        let filteredFiles = c.files;
        
        if (searchTerm || filterType !== 'all') {
          filteredFiles = c.files.filter(filePath => {
            // Find matching FileEntry
            const fileEntry = scannedFiles.find(sf => sf.path === filePath);
            
            if (searchTerm) {
              const matchesSearch = filePath.toLowerCase().includes(term);
              if (!matchesSearch) return false;
            }

            if (filterType !== 'all') {
              if (!fileEntry) return false; // Safety fallback
              
              if (filterType === 'directory' && fileEntry.kind !== 'directory') return false;
              
              if (fileEntry.kind === 'file') {
                const ext = fileEntry.extension || '';
                if (filterType === 'executable' && !['exe', 'app', 'bat', 'sh'].includes(ext)) return false;
                if (filterType === 'image' && !['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return false;
                if (filterType === 'document' && !['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return false;
              }
            }

            return true;
          });
        }
        
        // Sort files to put favorites at the top
        const sortedFiles = [...filteredFiles].sort((a, b) => {
          const aFav = localStorage.getItem(`favorite-${a}`) === 'true';
          const bFav = localStorage.getItem(`favorite-${b}`) === 'true';
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;
          return 0;
        });

        return { ...c, files: sortedFiles };
      })
    };
  }, [classification, scannedFiles, searchTerm, filterType, favoritesTick]);

  return (
    <div className="flex h-screen w-full flex-col bg-surface-base font-sans text-text-primary transition-colors duration-200">
      
      {recentAction && (
        <div className="fixed bottom-6 inset-x-0 mx-auto px-4 w-max max-w-sm z-[150] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-surface-card border border-border-lite shadow-xl rounded-full px-4 py-2 flex items-center gap-3">
             <span className="text-sm font-medium text-text-primary">{recentAction.message}</span>
             <div className="h-4 w-px bg-border-lite" />
             {recentAction.type === 'undo' ? (
               <button onClick={() => { handleRedo(); setRecentAction(null); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 tracking-wide transition-colors">
                 Rehacer
               </button>
             ) : (
               <button onClick={() => { handleUndo(); setRecentAction(null); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 tracking-wide transition-colors">
                 Deshacer
               </button>
             )}
             <button onClick={() => setRecentAction(null)} className="text-text-secondary hover:text-text-primary rounded-full p-1 -mr-2 transition-colors">
               <X className="w-4 h-4" />
             </button>
          </div>
        </div>
      )}

      {customizeContainerId && classification && (() => {
        const c = classification.containers.find(x => x.id === customizeContainerId);
        if (!c) return null;
        return (
          <ContainerSettingsModal
            container={c}
            existingNames={classification.containers.filter(x => x.id !== c.id).map(x => x.name.toLowerCase())}
            onClose={() => setCustomizeContainerId(null)}
            onSave={(updates) => {
              handleUpdateContainer(c.id, updates);
              setCustomizeContainerId(null);
            }}
          />
        );
      })()}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-card border border-border-lite p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-text-primary mb-3">Confirmación</h3>
            <p className="text-text-secondary text-sm mb-6 max-h-64 overflow-y-auto whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 rounded-lg font-medium text-sm border border-border-lite hover:bg-surface-base transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-4 py-2 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface-base border border-border-mute p-8 rounded-2xl shadow-2xl max-w-md w-full text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-500 border-4 border-red-500/30 text-5xl font-black shadow-inner">
              {countdown}
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">¿Estás seguro?</h2>
            <p className="text-text-secondary mb-8 text-sm">
              Estás a punto de realizar <strong>cambios reales</strong> en tu ordenador. Se confeccionarán las nuevas carpetas organizadas y se copiarán tus archivos en ellas.
            </p>
            <button 
              onClick={abortCountdown}
              className="w-full px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-red-500/25 active:scale-95"
            >
              ABORTAR Y VOLVER AL ENTORNO VIRTUAL
            </button>
          </div>
        </div>
      )}

      {(step === 'editor' && (isDirty || isEnvironmentReal)) && (
        <div 
          className={`fixed inset-0 z-40 pointer-events-none border-[6px] md:border-[10px] transition-colors duration-500 ease-in-out ${isEnvironmentReal ? 'border-red-500/50' : 'border-emerald-500/40'}`}
        >
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 bg-surface-base px-4 py-0.5 rounded-b-lg border-x-2 border-b-2 font-bold text-[8px] md:text-[10px] shadow-sm tracking-wide flex items-start gap-2 transition-colors duration-500 ${isEnvironmentReal ? 'border-red-500/50 text-red-600 dark:text-red-400' : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400'}`}>
             {isEnvironmentReal ? 
               'ENTORNO REAL: ESTA ES LA REALIDAD DE TU ORDENADOR' : 
               'ENTORNO VIRTUAL. NO SE HARÁN CAMBIOS EN TU ORDENADOR'
             }
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-lite bg-surface-card px-8 pt-6 pb-4 shadow-sm z-10 shrink-0 transition-colors duration-200">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <FolderOpen className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-text-primary flex items-baseline gap-2">
              <span className="text-[27px]">mostrador</span>
              <span className="text-[13.5px] text-text-secondary font-normal">v1</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-full border border-border-lite text-text-secondary hover:bg-surface-pill transition-colors mr-2 cursor-pointer"
            title="Alternar Modo Oscuro"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {step === 'editor' && (
            <>
              <div className="flex items-center space-x-1 mr-2 bg-surface-pill rounded-lg p-1 border border-border-lite">
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Deshacer (Ctrl+Z)"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={future.length === 0}
                  className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Rehacer (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center rounded-md bg-surface-pill pl-4 pr-2 py-1.5 border border-border-lite hidden md:flex">
                <span className="mr-2 text-xs font-mono text-text-secondary">CARPETA:</span>
                <span className="text-sm font-medium text-text-primary truncate max-w-[150px] mr-3">{folderName}</span>
                <button onClick={handleSelectFolder} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold px-2 py-1.5 rounded bg-surface-card border border-border-lite hover:bg-surface-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  Cambiar
                </button>
              </div>
              <button 
                onClick={handleExport}
                className="flex items-center space-x-2 rounded-lg bg-surface-card border border-border-lite px-4 py-2 text-sm font-bold text-text-primary shadow-sm hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar espacio</span>
              </button>
              <button 
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="flex items-center space-x-2 rounded-lg bg-indigo-600 text-white border border-indigo-700 px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isExportingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">{isExportingZip ? 'Exportando...' : 'Exportar Zip'}</span>
              </button>
              {dirHandle && (
                <button 
                  onClick={startApplyingToDisk}
                  disabled={isSavingToDisk}
                  className="flex items-center space-x-2 rounded-lg bg-red-600 text-white px-6 py-2 border border-red-700 text-sm font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSavingToDisk ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isSavingToDisk ? 'Guardando...' : 'Convertir en Realidad'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl w-full"
            >
              <div className="text-center mb-10">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-text-primary">Tu espacio, mejor.</h2>
                <p className="text-text-secondary text-lg">Organiza cualquier carpeta de tu ordenador, de forma 100% privada y local.</p>
              </div>

              <div className="space-y-6">
                {(window.self !== window.top) ? (
                  <div className="text-center bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl w-full">
                    <h3 className="text-xl font-bold text-text-primary mb-2">Requiere Pestaña Nueva</h3>
                    <p className="text-text-secondary mb-6 text-sm">
                      Para acceder a tus carpetas locales necesitamos usar herramientas avanzadas del navegador. Abre la aplicación en una pestaña nueva para habilitarlas. <br/><br/><strong>Tranquilidad:</strong> el proceso es 100% local. Ni los nombres ni el contenido de tus archivos se suben a internet ni se comparten con nadie.
                    </p>
                    <a 
                      href={window.location.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-4 text-sm font-bold text-white shadow-md transition-all"
                    >
                      <span>Abrir aplicación en pestaña nueva</span>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={handleSelectFolder}
                      className="w-full group bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl flex items-center justify-between transition-all shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <FolderSearch className="w-5 h-5 text-indigo-200 group-hover:text-white transition-colors" />
                        <span className="font-semibold transition-colors">Seleccionar Carpeta...</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-indigo-200 group-hover:text-white transition-colors group-hover:translate-x-1" />
                    </button>
                    <p className="text-center text-xs text-text-secondary mt-2 opacity-80">
                      El navegador pedirá permiso para <strong>ver</strong> los archivos.
                    </p>
                    {savedSessions.length > 0 && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-indigo-500/10">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Sesiones Recientes</p>
                        {savedSessions.map((session, index) => (
                          <button 
                            key={index}
                            onClick={() => handleResumeSession(session)}
                            className="w-full group bg-surface-card hover:bg-surface-base border border-border-lite hover:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl flex items-center justify-between transition-all shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <RotateCcw className="w-4 h-4 opacity-70" />
                              <div className="flex flex-col items-start">
                                <span className="font-medium text-sm truncate max-w-[200px] text-text-primary">{session.folderName}</span>
                                {session.timestamp && (
                                  <span className="text-xs text-text-secondary opacity-70">
                                    {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-70 transition-transform group-hover:translate-x-1" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {errorMsg && <p className="text-red-500 text-sm mt-3 flex items-center justify-center gap-1"><ArrowRight className="w-4 h-4"/> {errorMsg}</p>}
                
                <input 
                  type="file" 
                  {...{ webkitdirectory: "", directory: "" }}
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFallbackSelectFolder}
                />
              </div>
            </motion.div>
          )}

          {(step === 'scanning' || step === 'classifying') && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {step === 'scanning' ? 'Analizando archivos...' : 'Clasificando archivos...'}
              </h2>
              <p className="text-text-secondary mt-2">
                {step === 'scanning' 
                  ? 'Recorriendo los niveles de tu carpeta...' 
                  : 'El motor local está categorizando cada elemento de forma 100% privada.'}
              </p>
            </motion.div>
          )}

          {step === 'editor' && classification && filteredClassification && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full h-full flex flex-col"
            >
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-text-secondary text-sm font-medium">Archivos organizados en {classification.containers.length} contenedores. Puedes arrastrar y soltar para hacer ajustes.</span>
                  {viewMode !== 'list' && (
                    <div className="ml-4 flex items-center gap-1">
                      <button onClick={expandAll} className="px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Desplegar todos los contenedores">Desplegar todos</button>
                      <span className="text-border-heavy">|</span>
                      <button onClick={collapseAll} className="px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Plegar todos los contenedores">Plegar todos</button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex bg-surface-card rounded-lg border border-border-lite p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-text-secondary hover:text-text-primary'}`}
                      title="Vista principal"
                      aria-label="Vista principal"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-text-secondary hover:text-text-primary'}`}
                      title="Vista de lista"
                      aria-label="Vista de lista"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-surface-card border border-border-lite pl-9 pr-8 py-2 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Buscar por nombre"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                        aria-label="Limpiar búsqueda"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Filter className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="appearance-none bg-surface-card border border-border-lite pl-9 pr-8 py-2 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      aria-label="Filtrar por tipo"
                    >
                      <option value="all">Tipos: Todos</option>
                      <option value="executable">Ejecutables</option>
                      <option value="directory">Subcarpetas</option>
                      <option value="image">Imágenes</option>
                      <option value="document">Documentos</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDashboard(!showDashboard)}
                    className={`p-2 rounded-lg border border-border-lite transition-colors ${showDashboard ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-surface-card text-text-secondary hover:text-text-primary'}`}
                    title="Ver Estadísticas"
                  >
                    <PieChartIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showDashboard && (
                <div className="mb-6 p-4 bg-surface-card rounded-xl border border-border-lite mx-auto w-full max-w-4xl shadow-sm">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center">
                    <PieChartIcon className="w-4 h-4 mr-2 text-indigo-500" />
                    Distribución por Extensión (Total: {scannedFiles.length})
                  </h3>
                  <div className="h-48 w-full">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number, name: string) => [`${value} archivos`, name]}
                            contentStyle={{ borderRadius: '8px', zIndex: 1000 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-text-secondary text-sm">
                        No hay datos suficientes
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 w-full overflow-hidden pb-6">
                {viewMode !== 'list' ? (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    {viewMode === 'grid' ? (
                      <div className="flex w-full h-full gap-4">
                         <div className="w-1/3 min-w-[250px] max-w-[350px] flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar pb-6 relative z-10 text-left">
                           <SortableContext 
                             items={filteredClassification.containers.map(c => c.id)}
                             strategy={verticalListSortingStrategy}
                           >
                             {filteredClassification.containers.map(container => {
                                const isActive = focusedContainerId === null ? filteredClassification.containers[0]?.id === container.id : focusedContainerId === container.id;
                                return (
                                  <SplitMasterItem 
                                    key={container.id} 
                                    id={container.id} 
                                    name={container.name} 
                                    color={container.color}
                                    icon={container.icon}
                                    fileCount={container.files.length}
                                    isTrash={container.id === 'trash'}
                                    isFocused={isActive}
                                    onHover={() => setFocusedContainerId(container.id)}
                                    onClick={() => setFocusedContainerId(container.id)}
                                  />
                                )
                             })}
                             {!searchTerm && filterType === 'all' && (
                               <button
                                 onClick={addEmptyContainer}
                                 className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border-lite text-text-secondary hover:text-indigo-600 hover:border-indigo-400 hover:bg-surface-card bg-surface-base/30 transition-all duration-300 w-full mt-2"
                               >
                                 <Plus className="w-4 h-4" />
                                 <span className="font-medium text-sm">Nuevo Contenedor</span>
                               </button>
                             )}
                           </SortableContext>
                         </div>
                         
                         <div className="flex-1 bg-surface-card rounded-2xl shadow-inner relative overflow-hidden flex flex-col border border-border-lite ml-2">
                             {(()=>{
                                const focusedContainer = filteredClassification.containers.find(c => c.id === (focusedContainerId || filteredClassification.containers[0]?.id));
                                if (!focusedContainer) return <div className="w-full h-full flex items-center justify-center text-text-secondary">No hay contenedores</div>;
                                
                                return (
                                  <AnimatePresence mode="popLayout">
                                    <motion.div 
                                      key={focusedContainer.id}
                                      initial={{ opacity: 0, scaleY: 0.3, scaleX: 0.8, x: -80, transformOrigin: 'left center', filter: 'blur(8px)' }}
                                      animate={{ opacity: 1, scaleY: 1, scaleX: 1, x: 0, transformOrigin: 'left center', filter: 'blur(0px)' }}
                                      exit={{ opacity: 0, scaleY: 0.3, scaleX: 0.8, x: -80, transformOrigin: 'left center', filter: 'blur(8px)' }}
                                      transition={{ duration: 0.35, type: "spring", stiffness: 280, damping: 25 }}
                                      className="w-full h-full flex flex-col absolute inset-0"
                                    >
                                       <DetailDroppableArea 
                                         containerId={focusedContainer.id} 
                                         isTrash={focusedContainer.id === 'trash'}
                                         headerRenderer={(isOver) => (
                                           <div className={`px-6 py-4 border-b border-border-lite shadow-sm z-10 flex items-center justify-between transition-colors ${isOver ? (focusedContainer.id === 'trash' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40') : 'bg-surface-base'}`}>
                                             <h3 className="font-bold text-xl text-text-primary flex items-center gap-2">
                                                {focusedContainer.id === 'trash' ? <Trash2 className="w-6 h-6 text-red-500" /> : renderIcon(focusedContainer.icon, focusedContainer.color, 'w-6 h-6')}
                                                {editingFocusedContainerId === focusedContainer.id ? (
                                                  <input
                                                    ref={focusedInputRef}
                                                    type="text"
                                                    value={focusedContainerEditName}
                                                    onChange={e => setFocusedContainerEditName(e.target.value)}
                                                    onBlur={() => {
                                                       const trimmed = focusedContainerEditName.trim();
                                                       if (!trimmed) {
                                                         alert("El nombre del contenedor no puede estar vacío.");
                                                         setEditingFocusedContainerId(null);
                                                         return;
                                                       }
                                                       if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
                                                         alert("El nombre contiene caracteres especiales no permitidos. Solo se admiten letras, números, espacios, guiones y guiones bajos.");
                                                         setEditingFocusedContainerId(null);
                                                         return;
                                                       }
                                                       if (trimmed !== focusedContainer.name) {
                                                         handleUpdateContainer(focusedContainer.id, { name: trimmed });
                                                       }
                                                       setEditingFocusedContainerId(null);
                                                    }}
                                                    onKeyDown={e => {
                                                      if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                      } else if (e.key === 'Escape') {
                                                        setEditingFocusedContainerId(null);
                                                      }
                                                    }}
                                                    className="bg-surface-base border border-indigo-500 rounded px-2 py-0.5 text-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[200px]"
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <span 
                                                    className="cursor-text hover:bg-black/5 dark:hover:bg-white/5 py-0.5 px-1 rounded -ml-1 transition-colors"
                                                    onClick={() => {
                                                      if (focusedContainer.id !== 'trash') {
                                                        setFocusedContainerEditName(focusedContainer.name);
                                                        setEditingFocusedContainerId(focusedContainer.id);
                                                      }
                                                    }}
                                                    title={focusedContainer.id !== 'trash' ? "Click para renombrar" : focusedContainer.name}
                                                  >
                                                    {focusedContainer.name}
                                                  </span>
                                                )}
                                                <span className="text-sm font-mono text-text-secondary ml-2 relative top-0.5 opacity-60">[{focusedContainer.files.length}]</span>
                                             </h3>
                                             <div className="flex items-center gap-2">
                                                {focusedContainer.files.length > 0 && (
                                                  <button onClick={() => {
                                                    const isAllSelectedInModal = focusedContainer.files.length > 0 && focusedContainer.files.every(f => selectedFiles.has(f));
                                                    if (isAllSelectedInModal) handleDeselectAll(focusedContainer.files);
                                                    else handleSelectAll(focusedContainer.files);
                                                  }} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1" title="Seleccionar/Deseleccionar todo">
                                                    {focusedContainer.files.length > 0 && focusedContainer.files.every(f => selectedFiles.has(f)) ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4 text-text-secondary" />}
                                                    <span className="text-xs font-semibold text-text-secondary">Todo</span>
                                                  </button>
                                                )}
                                                {focusedContainer.id !== 'trash' && (
                                                  <button onClick={() => {
                                                    setFocusedContainerEditName(focusedContainer.name);
                                                    setEditingFocusedContainerId(focusedContainer.id);
                                                  }} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors" title="Renombrar contenedor">
                                                    <span className="text-xs font-semibold text-text-secondary">Renombrar</span>
                                                  </button>
                                                )}
                                                {focusedContainer.id.startsWith('custom-') && focusedContainer.files.length === 0 && (
                                                  <button onClick={() => {
                                                    requireConfirm('¿Eliminar contenedor?', () => handleDeleteContainer(focusedContainer.id, focusedContainer.files));
                                                  }} className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors" title="Eliminar contenedor">
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                )}
                                                {focusedContainer.id === 'trash' && focusedContainer.files.length > 0 && (() => {
                                                   const selectedInTrash = focusedContainer.files.filter(f => selectedFiles.has(f));
                                                   if (selectedInTrash.length > 0) {
                                                      return (
                                                        <div className="flex items-center gap-2">
                                                          <button onClick={() => handleTrashAction('restore', selectedInTrash)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm" title="Restaurar seleccionados">
                                                            <RotateCcw className="w-4 h-4" />
                                                            Restaurar ({selectedInTrash.length})
                                                          </button>
                                                          <button onClick={() => {
                                                            requireConfirm(`¿Eliminar permanentemente ${selectedInTrash.length} archivo(s)?`, () => handleTrashAction('delete', selectedInTrash));
                                                          }} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500/20 dark:bg-red-900/40 dark:hover:bg-red-900/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm" title="Eliminar seleccionados">
                                                            <Trash2 className="w-4 h-4" />
                                                            Eliminar ({selectedInTrash.length})
                                                          </button>
                                                        </div>
                                                      );
                                                   }
                                                   return (
                                                     <button onClick={() => {
                                                       requireConfirm('¿Vaciar papelera permanentemente?', () => handleTrashAction('delete', focusedContainer.files));
                                                     }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-bold flex items-center justify-center gap-1 shadow-sm" title="Vaciar papelera">
                                                       <Trash2 className="w-4 h-4 mr-1" />
                                                       Vaciar Todo
                                                     </button>
                                                   );
                                                })()}
                                             </div>
                                           </div>
                                         )}
                                       >
                                          <SortableContext items={focusedContainer.files} strategy={verticalListSortingStrategy}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8" data-files-grid="true">
                                               {focusedContainer.files.map((file, fileIdx) => (
                                                  <FileItem 
                                                    key={file}
                                                    id={file}
                                                    index={fileIdx}
                                                    file={file}
                                                    containerId={focusedContainer.id}
                                                    fileEntry={scannedFiles.find(sf => sf.path === file)}
                                                    isSelected={selectedFiles.has(file)}
                                                    isGroupDragging={activeId !== null && selectedFiles.has(activeId) && selectedFiles.has(file)}
                                                    onClick={handleFileClick}
                                                    onFavoriteToggle={handleFavoriteToggle}
                                                    onDoubleClick={handleFileDoubleClick}
                                                    dropFeedback={fileDropFeedback[file]}
                                                  />
                                               ))}
                                               {focusedContainer.files.length === 0 && (
                                                  <div className="col-span-full py-16 flex flex-col items-center justify-center opacity-50">
                                                    <FolderOpen className="w-16 h-16 text-text-secondary mb-4" />
                                                    <p className="text-sm text-text-secondary font-medium">Contenedor vacío</p>
                                                  </div>
                                               )}
                                            </div>
                                          </SortableContext>
                                       </DetailDroppableArea>
                                    </motion.div>
                                  </AnimatePresence>
                                )
                             })()}
                         </div>
                      </div>
                    ) : (
                      <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar items-start">
                        <SortableContext 
                          items={filteredClassification.containers.map(c => c.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {filteredClassification.containers.map(container => {
                            const isFiltering = searchTerm.trim().length > 0 || filterType !== 'all';
                            const isExpanded = isFiltering ? container.files.length > 0 : expandedContainers.has(container.id);
                            return (
                              <ContainerColumn 
                                key={container.id} 
                                id={container.id} 
                                name={container.name} 
                                color={container.color}
                                icon={container.icon}
                                files={container.files} 
                                scannedFiles={scannedFiles}
                                onUpdateContainer={handleUpdateContainer}
                                onCustomizeContainer={setCustomizeContainerId}
                                isExpanded={isExpanded}
                                onToggleExpand={() => toggleContainerExpand(container.id)}
                                isTrash={container.id === 'trash'}
                                onTrashAction={handleTrashAction}
                                onSort={sortContainer}
                                onDeleteContainer={handleDeleteContainer}
                                selectedFiles={selectedFiles}
                                activeId={activeId}
                                onFileClick={handleFileClick}
                                onFavoriteToggle={handleFavoriteToggle}
                                onDoubleClickFile={handleFileDoubleClick}
                                onSelectAll={handleSelectAll}
                                onDeselectAll={handleDeselectAll}
                                fileDropFeedback={fileDropFeedback}
                                requestConfirm={requireConfirm}
                                existingNames={filteredClassification.containers.filter(c => c.id !== container.id).map(c => c.name)}
                              />
                            );
                          })}
                        </SortableContext>
                        {!searchTerm && filterType === 'all' && (
                          <button
                            onClick={addEmptyContainer}
                            className="flex flex-col rounded-2xl p-5 overflow-hidden transition-all duration-300 min-w-[140px] max-w-[140px] h-[70vh] items-center justify-center border-2 border-dashed border-border-lite text-text-secondary hover:text-indigo-600 hover:border-indigo-400 hover:bg-surface-card bg-surface-base/30"
                          >
                            <Plus className="w-8 h-8 mb-2 opacity-50" />
                            <span className="font-medium text-sm" style={{ writingMode: 'vertical-rl' }}>Nuevo Contenedor</span>
                          </button>
                        )}
                      </div>
                    )}

                    <DragOverlay>
                      {activeId ? (
                        draggingContainer ? (
                          <div className="flex flex-col rounded-2xl p-5 shadow-2xl overflow-hidden min-w-[300px] max-w-[350px] h-[70vh] bg-surface-card border-2 border-indigo-500 scale-105 rotate-2 opacity-90 cursor-grabbing">
                            <div className="flex items-center justify-between border-border-lite mb-4 border-b pb-3 w-full">
                              <h3 className="flex items-center font-bold text-text-primary flex-1 min-w-0 mr-2">
                                <span className="rounded-full flex-shrink-0 bg-indigo-500 mr-2 h-2 w-2"></span>
                                {draggingContainer.name}
                              </h3>
                              <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-medium px-2 py-1 rounded-md ml-2 border border-indigo-200 dark:border-indigo-800">
                                {draggingContainer.files.length}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center rounded-lg px-3 py-2 text-xs font-medium text-text-primary truncate shadow-2xl rotate-3 scale-105 border-2 border-indigo-400 ring-4 ring-indigo-500/30 bg-surface-pill/90 backdrop-blur-md cursor-grabbing">
                            {selectedFiles.size > 1 ? `${selectedFiles.size} archivos` : activeName}
                          </div>
                        )
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <ListViewTable containers={filteredClassification.containers} scannedFiles={scannedFiles} />
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="text-center py-4 text-xs text-text-secondary border-t border-border-lite mt-auto bg-surface-card z-10">
        mostrador es un software desarrollado por Emilio Sevilla Ortego mediante Google AI Studio
      </footer>

    </div>
  );
}

