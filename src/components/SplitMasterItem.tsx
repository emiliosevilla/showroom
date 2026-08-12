import React, { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Loader2 } from 'lucide-react';
import { renderIcon } from '../utils/theme';
import { useLanguage } from '../i18n/LanguageContext';

/** Hover dwell before activating a non-focused sidebar container (click bypasses). */
export const CONTAINER_HOVER_ACTIVATE_MS = 2000;

export const SplitMasterItem = ({
  id, name, color, icon, fileCount, isTrash, isFocused, onHover, onClick
}: {
  key?: React.Key, id: string, name: string, color?: string, icon?: string, fileCount: number, isTrash: boolean, isFocused: boolean, onHover: () => void, onClick: () => void
}) => {
  const { t } = useLanguage();
  const { setNodeRef, isOver, transform, transition, attributes, listeners, isDragging } = useSortable({
    id, data: { type: 'container-list-item', containerId: id }
  });
  const [isHoverPending, setIsHoverPending] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHoverPending(false);
  };

  useEffect(() => () => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isFocused && !isDragging) return;
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHoverPending(false);
  }, [isFocused, isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const handleMouseEnter = () => {
    if (isFocused || isDragging) return;
    clearHoverTimer();
    setIsHoverPending(true);
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      setIsHoverPending(false);
      onHover();
    }, CONTAINER_HOVER_ACTIVATE_MS);
  };

  const handleMouseLeave = () => {
    clearHoverTimer();
  };

  const handleActivateNow = () => {
    clearHoverTimer();
    onClick();
  };

  return (
    <div 
      ref={setNodeRef} style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleActivateNow}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivateNow(); }
      }}
      tabIndex={0}
      data-container-id={id}
      className={`
        relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
        ${isOver ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 scale-[1.02] border-transparent' : (isFocused ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 ring-1 ring-indigo-400' : 'bg-surface-card hover:bg-surface-base border-border-lite border')}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        container-header-interactive
      `}
    >
      <div className="flex flex-1 items-center gap-3 overflow-hidden outline-none touch-none" {...attributes} {...listeners}>
         {isTrash ? <Trash2 className={`w-4 h-4 shrink-0 ${isFocused ? 'text-red-500' : 'text-red-400'}`} /> : renderIcon(icon, color, 'w-4 h-4')}
         <span className={`font-semibold truncate text-sm select-none text-text-primary`}>{name.startsWith("cat_") ? t(name as any) : name}</span>
      </div>
      {isHoverPending ? (
        <Loader2
          className="w-4 h-4 animate-spin text-indigo-500 shrink-0"
          aria-hidden
        />
      ) : (
        <span className={`text-xs font-mono w-8 text-right shrink-0 select-none text-text-secondary`}>[{fileCount}]</span>
      )}
    </div>
  );
};
