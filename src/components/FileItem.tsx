import React, { useState, useMemo } from 'react';
import { Star, Share2, Search } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useLanguage } from '../i18n/LanguageContext';
import { getImagePreview } from '../exportHtml';
import { FileEntry } from '../utils/fileSystem';
import { FilePreviewModal } from './Modals/FilePreviewModal';

export const FileItem = ({ 
  file, id, containerId, fileEntry, isSelected = false, isGroupDragging = false, onClick, onFavoriteToggle, onDoubleClick, dropFeedback, index
}: { 
  key?: React.Key; file: string; id: string; containerId: string; fileEntry?: FileEntry;
  isSelected?: boolean; isGroupDragging?: boolean; onClick?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onFavoriteToggle?: () => void;
  onDoubleClick?: (e: React.MouseEvent, id: string) => void;
  dropFeedback?: 'success-normal' | 'success-trash' | 'abort';
  index?: number;
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
            <span className={`truncate ${isFavorite ? 'text-amber-500 font-semibold' : ''}`}>{name.startsWith("cat_") ? t(name as any) : name}</span>
          </div>
          <div className="flex items-center">
            <button
              className={`p-1.5 rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isFavorite ? 'text-amber-500 hover:bg-amber-50/10' : 'text-text-secondary hover:text-amber-500 hover:bg-surface-base'}`}
              onClick={toggleFavorite}
              title={isFavorite ? t("remove_favorite") || "Quitar favorito" : t("add_favorite") || "Añadir favorito"}
              aria-label={isFavorite ? t("remove_favorite") || "Quitar favorito" : t("add_favorite") || "Añadir favorito"}
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
                  }).catch(err => console.error(t('error_sharing') || 'Error compartiendo', err));
                } else {
                  alert(`Opciones de compartir para: ${name}`);
                }
              }}
              title={t("share") || "Compartir"}
              aria-label="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {canPreview && !isImage && (
              <button
                className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-surface-base rounded-md transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                title={t("preview") || "Previsualizar"}
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
