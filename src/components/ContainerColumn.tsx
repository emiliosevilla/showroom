import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Trash2, Settings, ArrowDownAZ, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { FileEntry } from '../utils/fileSystem';
import { renderIcon } from '../utils/theme';
import { FileItem } from './FileItem';
import { GridDroppableArea } from './DroppableAreas';
import { Tooltip } from './Tooltip';

export const ContainerColumn = ({ existingNames = [], id, name, color, icon, files, scannedFiles, onUpdateContainer, onCustomizeContainer, isExpanded = true, onToggleExpand, onSort, onDeleteContainer,
  selectedFiles = new Set(), activeId = null, onFileClick, onFavoriteToggle, onDoubleClickFile, onSelectAll, onDeselectAll, fileDropFeedback = {}, requestConfirm
}: { 
  key?: React.Key; id: string; name: string; color?: string; icon?: string; files: string[]; scannedFiles: FileEntry[]; onUpdateContainer: (id: string, updates: {name?: string, color?: string, icon?: string}) => void;
  onCustomizeContainer?: (id: string) => void;
  isExpanded?: boolean; onToggleExpand?: () => void;
  onSort?: (id: string) => void; onDeleteContainer?: (id: string, files: string[]) => void;
  selectedFiles?: Set<string>; activeId?: string | null; onFileClick?: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  onFavoriteToggle?: () => void; onDoubleClickFile?: (e: React.MouseEvent, fileId: string) => void;
  onSelectAll?: (files: string[]) => void; onDeselectAll?: (files: string[]) => void;
  fileDropFeedback?: Record<string, 'success-normal' | 'abort'>;
  requestConfirm?: (msg: string, onConfirm: () => void) => void;
  existingNames?: string[];
}) => {
  const { t } = useLanguage();
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
      alert(t("name_empty") || "El nombre no puede estar vacío");
      setEditName(name);
      setIsEditing(false);
      return;
    }
    
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      alert(t("name_invalid") || "El nombre contiene caracteres inválidos");
      setEditName(name);
      setIsEditing(false);
      return;
    }

    if (existingNames.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Ya existe un contenedor con el nombre "${trimmed}".`);
      setEditName(name);
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

  const displayName = name.startsWith('cat_') ? t(name as any) : name;

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
            {renderIcon(icon, color, isExpanded ? 'mr-2 w-5 h-5' : 'mb-2 w-6 h-6')}
            
            {isEditing && isExpanded ? (
              <input
                ref={inputRef}
                type="text"
                className="flex-1 min-w-0 bg-surface-base border border-indigo-500 rounded px-2 py-0.5 text-sm outline-none w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
                aria-label={t("rename_container") || "Renombrar contenedor"}
              />
            ) : (
              <span 
                className={`container-header-interactive truncate focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isExpanded ? 'cursor-text hover:bg-black/5 dark:hover:bg-white/5 py-0.5 px-1 rounded -ml-1 transition-colors' : 'text-lg overflow-visible tracking-widest rotate-180'}`}
                tabIndex={isExpanded ? 0 : undefined}
                role={isExpanded ? "button" : undefined}
                aria-label={isExpanded ? `${t('rename_container') || 'Renombrar contenedor'} ${displayName}` : displayName}
                data-container-id={id}
                onClick={(e) => {
                  if (isExpanded) {
                    e.stopPropagation();
                    setIsEditing(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (isExpanded && (e.key === 'Enter' || e.key === ' ')) {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsEditing(true);
                  }
                }}
                title={isExpanded ? (t("click_to_rename") || "Clic para renombrar") : displayName}
              >
                {displayName}
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
          <div className="flex justify-between mb-2 gap-2 text-text-secondary">
            {files.length > 0 ? (
              <button 
                onClick={toggleSelection} 
                className="flex items-center text-xs text-text-secondary hover:text-indigo-600 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 -ml-1"
                title={t("select_all") || "Seleccionar todo"}
                aria-label={isAllSelected ? (t("deselect_all") || "Deseleccionar todo") : (t("select_all") || "Seleccionar todo")}
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
                  title={t("configure") || "Configurar"}
                  aria-label={t("configure") || "Configurar"}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Color/Icono
                </button>
              )}
              {files.length > 0 && typeof onSort === 'function' && (
                <button 
                  onClick={() => onSort(id)}
                  className="flex items-center text-xs hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
                  title={t("sort_alpha") || "Ordenar alfabéticamente"}
                  aria-label={t("sort_alpha") || "Ordenar alfabéticamente"}
                >
                  <ArrowDownAZ className="w-4 h-4 mr-1" />
                  Ordenar
                </button>
              )}
              {id.startsWith('custom-') && typeof onDeleteContainer === 'function' && files.length === 0 && (
                 <Tooltip content={t("delete_this_container")}>
                 <button 
                  onClick={() => {
                    doConfirm(`${t('delete_container_q') || '¿Eliminar contenedor'} \"${displayName}\"?`, () => {
                      if (onDeleteContainer) onDeleteContainer(id, files);
                    });
                  }}
                  className="flex items-center text-xs hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1"
                  aria-label={`Eliminar contenedor ${displayName}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </button>
                </Tooltip>
              )}
            </div>
          </div>
          <GridDroppableArea containerId={id}>
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
