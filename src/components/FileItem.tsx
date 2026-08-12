import React, { useState, useMemo } from 'react';
import { Star, Share2, Search } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useLanguage } from '../i18n/LanguageContext';
import { getImagePreview } from '../exportHtml';
import { FileEntry } from '../utils/fileSystem';
import { FilePreviewModal } from './Modals/FilePreviewModal';
import { Tooltip } from './Tooltip';

export const FileItem = ({ 
  file, id, containerId, fileEntry, isSelected = false, isGroupDragging = false, onClick, onFavoriteToggle, onDoubleClick, dropFeedback, index, compact = false, isActivePreview = false
}: { 
  key?: React.Key; file: string; id: string; containerId: string; fileEntry?: FileEntry;
  isSelected?: boolean; isGroupDragging?: boolean; onClick?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onFavoriteToggle?: () => void;
  onDoubleClick?: (e: React.MouseEvent, id: string) => void;
  dropFeedback?: 'success-normal' | 'abort';
  index?: number;
  /** Hide inline thumbnail — used in Individual list when preview pane is shown. */
  compact?: boolean;
  isActivePreview?: boolean;
}) => {
  const { t } = useLanguage();
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
        className={`item-pill flex flex-col rounded-lg px-3 py-2 text-xs font-medium overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500
          ${dropFeedback === 'success-normal' ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-md' :
            dropFeedback === 'abort' ? 'ring-2 ring-inset ring-gray-600 dark:ring-gray-400 bg-gray-50 dark:bg-gray-800 shadow-md' :
            isDragging ? 'opacity-40 ring-2 ring-dashed ring-indigo-400 bg-indigo-500/10 shadow-inner scale-[0.98]' :
            isSelected ? 'is-selected ring-2 ring-indigo-500 scale-[1.01] z-[1] relative' :
            isActivePreview ? 'ring-2 ring-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20' :
            isGroupDragging ? 'ring-2 ring-indigo-400 bg-indigo-50/80 shadow-sm font-medium' :
            'opacity-100 shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:ring-indigo-300 hover:shadow-md'}`}
      >
        <div className="w-full flex items-center justify-between gap-1">
          <div {...listeners} {...attributes} className="flex-1 truncate outline-none self-stretch flex items-center min-w-0" title={file}>
            <span className={`item-pill-label truncate ${isFavorite ? 'text-amber-500 font-semibold' : ''}`}>{name.startsWith("cat_") ? t(name as any) : name}</span>
          </div>
          <div className="flex items-center">
            <Tooltip content={isFavorite ? t("remove_favorite") : t("add_favorite")}>
              <button
                className={`p-1.5 rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isFavorite ? 'text-amber-500 hover:bg-amber-50/10' : 'text-text-secondary hover:text-amber-500 hover:bg-surface-base'}`}
                onClick={toggleFavorite}
                aria-label={isFavorite ? t("remove_favorite") : t("add_favorite")}
              >
                <Star className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </Tooltip>
            <Tooltip content={t("share")}>
              <button
                className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-surface-base rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.share) {
                    navigator.share({
                      title: name,
                      text: `Mira este archivo: ${name}`,
                    }).catch(err => console.error(t('error_sharing') || 'Error compartiendo', err));
                  } else {
                    alert(`Opciones de compartir para: ${name}`);
                  }
                }}
                aria-label={t("share")}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </Tooltip>
            {canPreview && !isImage && !compact && (
              <Tooltip content={t("preview")}>
                <button
                  className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-surface-base rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                  aria-label={t("preview")}
                >
                  <Search className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
        {previewUrl && !compact && (
          <div className="group relative mt-2 w-full h-20 bg-surface-base rounded-md flex items-center justify-center overflow-hidden border border-border-lite border-opacity-50 outline-none">
            <img src={previewUrl} alt={name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
            <button
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
              className="absolute inset-0 w-full h-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
              aria-label={`${t("preview")} ${name}`}
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
