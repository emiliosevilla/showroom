import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from './i18n/LanguageContext';
import { scanDirectory, FileEntry, processFileList } from './utils/fileSystem';
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

import { COLOR_VARIANTS, AVAILABLE_COLORS, AVAILABLE_ICONS, renderIcon } from './utils/theme';

import { ContainerSettingsModal } from './components/Modals/ContainerSettingsModal';

import { DetailDroppableArea, GridDroppableArea } from './components/DroppableAreas';
import { FilePreviewModal } from './components/Modals/FilePreviewModal';

import { FileItem } from './components/FileItem';

import { ContainerColumn } from './components/ContainerColumn';

import { PreviewTooltip } from './components/PreviewTooltip';

import { SplitMasterItem } from './components/SplitMasterItem';

import { ListViewTable } from './components/ListViewTable';


// --- Main App ---

export default function App() {
  const { t, language, toggleLanguage } = useLanguage();
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
  const [isDirty, setIsDirty] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
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
    }).catch(err => console.log(t('no_saved_sessions'), err));
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
        
        setKey('smartfolder_sessions', currentSessions).catch(err => console.error(t('error_saving_session'), err));
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
    setRecentAction({ message: t('action_undone'), timestamp: Date.now(), type: 'undo' });
  }, [history]);

  const handleRedo = React.useCallback(() => {
    if (future.length === 0) return;
    const nextState = future[0];
    setFuture(f => f.slice(1));
    setClassification(current => {
      if (current) setHistory(h => [...h, current].slice(-30));
      return nextState;
    });
    setRecentAction({ message: t('action_redone'), timestamp: Date.now(), type: 'normal' });
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
        setErrorMsg(t('folder_empty'));
        setStep('input');
        return;
      }
      
      const cappedFiles = entries.slice(0, 2000);
      setStep('classifying');
      const result = await classifyFiles(cappedFiles);
      if (!result.containers.find((c: any) => c.id === 'trash')) {
        result.containers.push({ id: 'trash', name: t('trash'), files: [] });
      }
      setClassification(result);
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (err: any) {
       console.error(err);
       setErrorMsg(t('error_processing'));
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
          throw new Error(t('permissions_denied'));
        }
      }
      setDirHandle(handle);
      setFolderName(session.folderName);
      
      abortControllerRef.current = new AbortController();
      let filesDesc: FileEntry[] = [];
      try {
        filesDesc = await scanDirectory(handle, '', abortControllerRef.current.signal);
      } catch (e: any) {
        if (e.message === 'LIMIT_EXCEEDED') {
          setErrorMsg(t('limit_exceeded_error'));
        } else if (e.message === 'AbortError') {
          setErrorMsg(t('scan_aborted'));
        } else {
          setErrorMsg(t('scan_error'));
        }
        setStep('input');
        return;
      }
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
      abortControllerRef.current = new AbortController();
      let filesDesc: FileEntry[] = [];
      try {
        filesDesc = await scanDirectory(handle, '', abortControllerRef.current.signal);
      } catch (e: any) {
        if (e.message === 'LIMIT_EXCEEDED') {
          setErrorMsg(t('limit_exceeded_error'));
        } else if (e.message === 'AbortError') {
          setErrorMsg(t('scan_aborted'));
        } else {
          setErrorMsg(t('scan_error'));
        }
        setStep('input');
        return;
      }
      setScannedFiles(filesDesc);
      
      if (filesDesc.length === 0) {
        setErrorMsg(t('folder_empty'));
        setStep('input');
        return;
      }
      
      // Ahora que es totalmente local, procesar 2000 elementos no es problema
      const cappedFiles = filesDesc.slice(0, 2000);

      setStep('classifying');
      
      // Classify locally
      const result = await classifyFiles(cappedFiles);
      if (!result.containers.find((c: any) => c.id === 'trash')) {
        result.containers.push({ id: 'trash', name: t('trash'), files: [] });
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
        setErrorMsg(t('error_accessing_folder'));
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
    }, filesToTrash.length > 0 ? `${t("container_deleted")} y ${filesToTrash.length} ${t("files")} ${t("to_trash")}` : t('container_deleted'));

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
             const otrosContainer = { id: 'otros', name: t('other'), files: [] };
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
      const newContainer = { id: newId, name: t('new_container_name'), files: [] };
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
    }, t('new_container_added'));
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
    }, t('container_sorted'));
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
        }, t('container_reorganized'));
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
    }, `Movido(s) ${filesToMove.length} archivo(s)` + (targetContainerId === 'trash' ? t('to_trash') : ''));

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
    const htmlStr = generateEnhancedHtmlString(folderName, classification, t);
    
    try {
      if (dirHandle) {
        // Tratar de guardar directamente en la carpeta para un funcionamiento perfecto
        const fileHandle = await dirHandle.getFileHandle(`Vista_Mejorada_${folderName}.html`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(htmlStr);
        await writable.close();
        
        alert(t('export_success_long').replace('{0}', folderName).replace('{1}', folderName));
        return; // Salir si tuvo éxito
      }
    } catch (e) {
      console.log(t('save_fallback'), e);
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
      
      setRecentAction({ message: t('zip_exported'), timestamp: Date.now(), type: 'normal' });
    } catch (e) {
      console.error(t('zip_error'), e);
      alert(t('zip_error_generic'));
    } finally {
      setIsExportingZip(false);
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
             <button onClick={() => setRecentAction(null)} aria-label="Cerrar" className="text-text-secondary hover:text-text-primary rounded-full p-1 -mr-2 transition-colors">
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
            <h3 className="text-lg font-bold text-text-primary mb-3">{t("confirmation")}</h3>
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


      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-lite bg-surface-card px-8 pt-6 pb-4 shadow-sm z-10 shrink-0 transition-colors duration-200">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <FolderOpen className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-text-primary flex items-baseline gap-2">
              <span className="text-[27px]">showroom</span>
              <span className="text-[13.5px] text-text-secondary font-normal">v1</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleLanguage} 
            className="p-2.5 rounded-xl hover:bg-surface-pill transition-colors text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
            title={language === 'es' ? t('switch_en') : t('switch_es')}
          >
            {language === 'es' ? '🇪🇸' : '🇬🇧'}
          </button>
          <button 
            onClick={toggleDarkMode} 
            className="p-2.5 rounded-xl hover:bg-surface-pill transition-colors text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={t("dark_mode_toggle")}
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
                  title={t("undo_shortcut")}
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={future.length === 0}
                  className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title={t("redo_shortcut")}
                >
                  <Redo2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center rounded-md bg-surface-pill pl-4 pr-2 py-1.5 border border-border-lite hidden md:flex">
                <span className="mr-2 text-xs font-mono text-text-secondary">{t("folder_label")}</span>
                <span className="text-sm font-medium text-text-primary truncate max-w-[150px] mr-3">{folderName}</span>
                <button onClick={handleSelectFolder} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold px-2 py-1.5 rounded bg-surface-card border border-border-lite hover:bg-surface-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {t("change_btn")}
                </button>
              </div>
              <button 
                onClick={handleExport}
                className="flex items-center space-x-2 rounded-lg bg-surface-card border border-border-lite px-4 py-2 text-sm font-bold text-text-primary shadow-sm hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">{t("export_space")}</span>
              </button>
              <button 
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="flex items-center space-x-2 rounded-lg bg-indigo-600 text-white border border-indigo-700 px-4 py-2 text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isExportingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">{isExportingZip ? t('exporting') : t('export_zip_btn')}</span>
              </button>
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
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-text-primary">{t("hero_title")}</h2>
                <p className="text-text-secondary text-lg">{t("hero_subtitle")}</p>
              </div>

              <div className="space-y-6">
                {(window.self !== window.top) ? (
                  <div className="text-center bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl w-full">
                    <h3 className="text-xl font-bold text-text-primary mb-2">{t("new_tab_req")}</h3>
                    <p className="text-text-secondary mb-6 text-sm">
                      <span dangerouslySetInnerHTML={{ __html: t("open_new_tab_msg") }} />
                    </p>
                    <a 
                      href={window.location.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-4 text-sm font-bold text-white shadow-md transition-all"
                    >
                      <span>{t("open_new_tab")}</span>
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
                        <span className="font-semibold transition-colors">{t("select_folder_short")}</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-indigo-200 group-hover:text-white transition-colors group-hover:translate-x-1" />
                    </button>
                    <p className="text-center text-xs text-text-secondary mt-2 opacity-80">
                      {t("browser_permission_1")} <strong>{t("browser_permission_2")}</strong> {t("browser_permission_3")}
                    </p>
                    {savedSessions.length > 0 && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-indigo-500/10">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{t("recent_sessions")}</p>
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {step === 'scanning' ? t('analyzing_files') : t('classifying_files')}
              </h2>
              <p className="text-text-secondary mt-2 mb-6">
                {step === 'scanning' 
                  ? t('scanning_levels') 
                  : t('categorizing_private')}
              </p>
              {step === 'scanning' && (
                <button 
                  onClick={() => abortControllerRef.current?.abort()} 
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Cancelar escaneo
                </button>
              )}
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
                  <span className="text-text-secondary text-sm font-medium">{t("files_organized_in")} {classification.containers.length} {t("containers_drag_drop")}</span>
                  {viewMode !== 'list' && (
                    <div className="ml-4 flex items-center gap-1">
                      <button onClick={expandAll} className="px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={t("expand_all_containers")}>{t("expand_all")}</button>
                      <span className="text-border-heavy">|</span>
                      <button onClick={collapseAll} className="px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={t("collapse_all_containers")}>{t("collapse_all")}</button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex bg-surface-card rounded-lg border border-border-lite p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-text-secondary hover:text-text-primary'}`}
                      title={t("main_view")}
                      aria-label={t("main_view")}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-text-secondary hover:text-text-primary'}`}
                      title={t("list_view")}
                      aria-label={t("list_view")}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder={t("search_by_name")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-surface-card border border-border-lite pl-9 pr-8 py-2 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={t("search_by_name_aria")}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                        aria-label={t("clear_search")}
                        title={t("clear_search")}
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
                      aria-label={t("filter_by_type")}
                    >
                      <option value="all">{t("types_all")}</option>
                      <option value="executable">{t("types_executables")}</option>
                      <option value="directory">{t("types_subfolders")}</option>
                      <option value="image">{t("types_images")}</option>
                      <option value="document">{t("types_documents")}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDashboard(!showDashboard)}
                    className={`p-2 rounded-lg border border-border-lite transition-colors ${showDashboard ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-surface-card text-text-secondary hover:text-text-primary'}`}
                    title={t("view_stats")}
                  >
                    <PieChartIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showDashboard && (
                <div className="mb-6 p-4 bg-surface-card rounded-xl border border-border-lite mx-auto w-full max-w-4xl shadow-sm">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center">
                    <PieChartIcon className="w-4 h-4 mr-2 text-indigo-500" />
                    {t("distribution_by_ext")} {scannedFiles.length})
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
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value, name) => [`${value} archivos`, name]}
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
                                 <span className="font-medium text-sm">{t("add_container")}</span>
                               </button>
                             )}
                           </SortableContext>
                         </div>
                         
                         <div className="flex-1 bg-surface-card rounded-2xl shadow-inner relative overflow-hidden flex flex-col border border-border-lite ml-2">
                             {(()=>{
                                const focusedContainer = filteredClassification.containers.find(c => c.id === (focusedContainerId || filteredClassification.containers[0]?.id));
                                if (!focusedContainer) return <div className="w-full h-full flex items-center justify-center text-text-secondary">{t("no_containers")}</div>;
                                
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
                                                    aria-label={t("rename_container")}
                                                    value={focusedContainerEditName}
                                                    onChange={e => setFocusedContainerEditName(e.target.value)}
                                                    onBlur={() => {
                                                       const trimmed = focusedContainerEditName.trim();
                                                       if (!trimmed) {
                                                         alert(t("name_empty"));
                                                         setEditingFocusedContainerId(null);
                                                         return;
                                                       }
                                                       if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
                                                         alert(t("name_invalid"));
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
                                                    title={focusedContainer.id !== 'trash' ? t("click_to_rename") : focusedContainer.name}
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
                                                  }} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1" title={t("toggle_select_all")}>
                                                    {focusedContainer.files.length > 0 && focusedContainer.files.every(f => selectedFiles.has(f)) ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4 text-text-secondary" />}
                                                    <span className="text-xs font-semibold text-text-secondary">{t("all")}</span>
                                                  </button>
                                                )}
                                                {focusedContainer.id !== 'trash' && (
                                                  <button onClick={() => {
                                                    setFocusedContainerEditName(focusedContainer.name);
                                                    setEditingFocusedContainerId(focusedContainer.id);
                                                  }} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors" title={t("rename_container")}>
                                                    <span className="text-xs font-semibold text-text-secondary">{t("rename")}</span>
                                                  </button>
                                                )}
                                                {focusedContainer.id.startsWith('custom-') && focusedContainer.files.length === 0 && (
                                                  <button onClick={() => {
                                                    requireConfirm('¿Eliminar contenedor?', () => handleDeleteContainer(focusedContainer.id, focusedContainer.files));
                                                  }} className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors" title={t("delete_container")}>
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                )}
                                                {focusedContainer.id === 'trash' && focusedContainer.files.length > 0 && (() => {
                                                   const selectedInTrash = focusedContainer.files.filter(f => selectedFiles.has(f));
                                                   if (selectedInTrash.length > 0) {
                                                      return (
                                                        <div className="flex items-center gap-2">
                                                          <button onClick={() => handleTrashAction('restore', selectedInTrash)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm" title={t("restore_selected")}>
                                                            <RotateCcw className="w-4 h-4" />
                                                            Restaurar ({selectedInTrash.length})
                                                          </button>
                                                          <button onClick={() => {
                                                            requireConfirm(`¿Eliminar permanentemente ${selectedInTrash.length} archivo(s)?`, () => handleTrashAction('delete', selectedInTrash));
                                                          }} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500/20 dark:bg-red-900/40 dark:hover:bg-red-900/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm" title={t("delete_selected_short")}>
                                                            <Trash2 className="w-4 h-4" />
                                                            Eliminar ({selectedInTrash.length})
                                                          </button>
                                                        </div>
                                                      );
                                                   }
                                                   return (
                                                     <button onClick={() => {
                                                       requireConfirm('¿Vaciar papelera permanentemente?', () => handleTrashAction('delete', focusedContainer.files));
                                                     }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-bold flex items-center justify-center gap-1 shadow-sm" title={t("empty_trash_action")}>
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
                                                    <p className="text-sm text-text-secondary font-medium">{t("empty_container")}</p>
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
                            <span className="font-medium text-sm" style={{ writingMode: 'vertical-rl' }}>{t("add_container")}</span>
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
        {t("developed_by")}
      </footer>

    </div>
  );
}

