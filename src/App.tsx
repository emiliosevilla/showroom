import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from './i18n/LanguageContext';
import { useFileSystem } from './hooks/useFileSystem';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { setKey, getKey } from './utils/idb';
import { classifyFiles, ClassificationResult } from './services/classifier';
import { FolderSearch, Loader2, FolderOpen, ArrowRight, Search, Filter, Moon, Sun, ArrowUpDown, Star, Trash2, RotateCcw, ChevronDown, ChevronRight, CheckSquare, Square, Plus, X, PieChart as PieChartIcon, Undo2, Redo2, Settings, Shield, Globe, Monitor } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  DndContext, 
  DragOverlay, 
  pointerWithin,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'motion/react';

import { renderIcon } from './utils/theme';

import { ContainerSettingsModal } from './components/Modals/ContainerSettingsModal';

import { DetailDroppableArea } from './components/DroppableAreas';

import { FileItem } from './components/FileItem';

import { ContainerColumn } from './components/ContainerColumn';

import { SplitMasterItem } from './components/SplitMasterItem';
import { FilePreviewPane } from './components/FilePreviewPane';
import { FilePropertiesPanel } from './components/FilePropertiesPanel';
import { Tooltip } from './components/Tooltip';
import { ensureFileHydrated } from './utils/fileSystem';
import { isEmbeddedFrame } from './utils/embedContext';

type FileSortMode = 'name_asc' | 'name_desc' | 'date' | 'size' | 'ext' | 'favorites';
type FilterType = 'all' | 'favorites' | 'image' | 'document' | 'code' | 'multimedia' | 'compressed' | 'executable' | 'other';
type GroupByMode = 'none' | 'extension' | 'container';

const EXEC_EXTS = ['exe', 'msi', 'bat', 'sh', 'app', 'apk', 'bin'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'psd', 'ai', 'ico'];
const DOC_EXTS = ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'csv'];
const COMPRESSED_EXTS = ['zip', 'rar', '7z', 'tar', 'gz'];
const MULTI_EXTS = ['mp3', 'mp4', 'wav', 'avi', 'mkv', 'mov', 'webm', 'ogg'];
const CODE_EXTS = ['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'cpp', 'c', 'tsx', 'jsx'];

function matchesFilterType(
  filePath: string,
  fileEntry: { kind?: string; extension?: string } | undefined,
  filterType: FilterType,
  containerId: string,
): boolean {
  if (filterType === 'all') return true;
  if (filterType === 'favorites') return localStorage.getItem(`favorite-${filePath}`) === 'true';
  if (!fileEntry || fileEntry.kind === 'directory') return false;
  const ext = (fileEntry.extension || '').toLowerCase();
  if (filterType === 'executable') return EXEC_EXTS.includes(ext);
  if (filterType === 'image') return IMAGE_EXTS.includes(ext);
  if (filterType === 'document') return DOC_EXTS.includes(ext);
  if (filterType === 'compressed') return COMPRESSED_EXTS.includes(ext);
  if (filterType === 'multimedia') return MULTI_EXTS.includes(ext);
  if (filterType === 'code') return CODE_EXTS.includes(ext);
  if (filterType === 'other') {
    if (containerId === 'otros') return true;
    return !EXEC_EXTS.includes(ext) && !IMAGE_EXTS.includes(ext) && !DOC_EXTS.includes(ext)
      && !COMPRESSED_EXTS.includes(ext) && !MULTI_EXTS.includes(ext) && !CODE_EXTS.includes(ext);
  }
  return true;
}

function matchesSearchTokens(
  filePath: string,
  fileEntry: { extension?: string } | undefined,
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  const name = filePath.split('/').pop() || filePath;
  const ext = (fileEntry?.extension || '').toLowerCase();
  const haystack = `${name} ${filePath} ${ext}`.toLowerCase();
  return tokens.every(token => haystack.includes(token));
}

export default function App() {
  const { t, language, toggleLanguage } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'columns'>('grid');
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [focusedContainerId, setFocusedContainerId] = useState<string | null>(null);
  const [customizeContainerId, setCustomizeContainerId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activePreviewPath, setActivePreviewPath] = useState<string | null>(null);
  const [fileSortMode, setFileSortMode] = useState<FileSortMode>('favorites');
  const [isDirty, setIsDirty] = useState(false);
  const [favoritesTick, setFavoritesTick] = useState(0);

  const [editingFocusedContainerId, setEditingFocusedContainerId] = useState<string | null>(null);
  const [focusedContainerEditName, setFocusedContainerEditName] = useState('');
  const focusedInputRef = useRef<HTMLInputElement>(null);
  type EditorSnapshot = {
    classification: ClassificationResult;
  };
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);
  const [recentAction, setRecentAction] = useState<{ message: string, timestamp: number, type?: 'undo' | 'normal' } | null>(null);

  useEffect(() => {
    if (recentAction) {
       const timer = setTimeout(() => setRecentAction(null), 5000);
       return () => clearTimeout(timer);
    }
  }, [recentAction]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const {
    step,
    folderName,
    dirHandle,
    workspacePath,
    scannedFiles,
    setScannedFiles,
    errorMsg,
    fileInputRef,
    abortControllerRef,
    handleSelectFolder,
    handleFallbackSelectFolder,
    handleResumeSession,
  } = useFileSystem({
    t,
    classifyFiles,
    setClassification,
    setExpandedContainers,
    setIsDirty,
    savedSessions,
    setSavedSessions,
  });
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
    if (step !== 'editor' || !classification || !folderName) return;
    if (!dirHandle && !workspacePath) return;

    let cancelled = false;
    (async () => {
      try {
        const sessions = await getKey<any>('smartfolder_sessions');
        let currentSessions = Array.isArray(sessions) ? sessions : [];
        const matchKey = (workspacePath || folderName).toLowerCase();
        const prev = currentSessions.find(
          (s: any) => (s.workspacePath || s.folderName || '').toLowerCase() === matchKey
        );
        currentSessions = currentSessions.filter(
          (s: any) => (s.workspacePath || s.folderName || '').toLowerCase() !== matchKey
        );

        const newSession: Record<string, unknown> = {
          folderName,
          classification,
          timestamp: Date.now(),
        };
        if (dirHandle) newSession.dirHandle = dirHandle;
        if (workspacePath) newSession.workspacePath = workspacePath;
        else if (prev?.workspacePath) newSession.workspacePath = prev.workspacePath;

        currentSessions.unshift(newSession);
        currentSessions = currentSessions.slice(0, 10);

        await setKey('smartfolder_sessions', currentSessions);
        if (!cancelled) setSavedSessions(currentSessions);
      } catch (err) {
        console.error(t('error_saving_session'), err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, classification, dirHandle, workspacePath, folderName, t]);

  const commitClassificationChange = (
    updater: ClassificationResult | ((prev: ClassificationResult | null) => ClassificationResult | null),
    actionDesc?: string
  ) => {
    setClassification(prev => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      if (prev && nextState && JSON.stringify(prev) !== JSON.stringify(nextState)) {
        setHistory(h => [...h, { classification: prev }].slice(-30));
        setFuture([]);
        setIsDirty(true);
        if (actionDesc) {
           setRecentAction({ message: actionDesc, timestamp: Date.now() });
        }
      }
      return nextState;
    });
  };

  const {
    sensors,
    activeId,
    fileDropFeedback,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useDragAndDrop({
    t,
    classification,
    commitClassificationChange,
    selectedFiles,
    setSelectedFiles,
    focusedContainerId,
    setFocusedContainerId,
  });

  const handleUndo = React.useCallback(() => {
    if (history.length === 0) return;
    const previousSnapshot = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setClassification(current => {
      if (current) {
        setFuture(f => [{ classification: current }, ...f]);
      }
      return previousSnapshot.classification;
    });
    setRecentAction({ message: t('action_undone'), timestamp: Date.now(), type: 'undo' });
  }, [history, t]);

  const handleRedo = React.useCallback(() => {
    if (future.length === 0) return;
    const nextSnapshot = future[0];
    setFuture(f => f.slice(1));
    setClassification(current => {
      if (current) {
        setHistory(h => [...h, { classification: current }].slice(-30));
      }
      return nextSnapshot.classification;
    });
    setRecentAction({ message: t('action_redone'), timestamp: Date.now(), type: 'normal' });
  }, [future, t]);

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
    setActivePreviewPath(id);
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (e && 'shiftKey' in e && e.shiftKey) {
        next.add(id);
      } else if (e && 'metaKey' in e && (e.metaKey || ('ctrlKey' in e && e.ctrlKey))) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        return new Set([id]);
      }
      return next;
    });
  };

  const scannedFilesRef = useRef(scannedFiles);
  scannedFilesRef.current = scannedFiles;

  useEffect(() => {
    if (!activePreviewPath) return;
    let cancelled = false;
    (async () => {
      const entry = scannedFilesRef.current.find(sf => sf.path === activePreviewPath);
      if (!entry || (entry.hydrated && entry.fileObject)) return;
      const hydrated = await ensureFileHydrated(entry);
      if (cancelled) return;
      setScannedFiles(prev => prev.map(f => f.path === hydrated.path ? { ...f, ...hydrated } : f));
    })();
    return () => { cancelled = true; };
  }, [activePreviewPath, setScannedFiles]);

  const handleFileDoubleClick = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      let fileEntry = scannedFiles.find(sf => sf.path === path);
      if (fileEntry && !fileEntry.fileObject) {
        fileEntry = await ensureFileHydrated(fileEntry);
        setScannedFiles(prev => prev.map(f => f.path === fileEntry!.path ? { ...f, ...fileEntry! } : f));
      }
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

  const sortFilesForDisplay = (files: string[]): string[] => {
    const basename = (p: string) => p.split('/').pop() || p;
    return [...files].sort((a, b) => {
      const ea = scannedFiles.find(sf => sf.path === a);
      const eb = scannedFiles.find(sf => sf.path === b);
      const aFav = localStorage.getItem(`favorite-${a}`) === 'true';
      const bFav = localStorage.getItem(`favorite-${b}`) === 'true';
      if (fileSortMode === 'favorites') {
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return basename(a).localeCompare(basename(b), undefined, { sensitivity: 'base' });
      }
      if (fileSortMode === 'name_asc') return basename(a).localeCompare(basename(b), undefined, { sensitivity: 'base' });
      if (fileSortMode === 'name_desc') return basename(b).localeCompare(basename(a), undefined, { sensitivity: 'base' });
      if (fileSortMode === 'date') return (eb?.lastModified || 0) - (ea?.lastModified || 0);
      if (fileSortMode === 'size') return (eb?.size || 0) - (ea?.size || 0);
      if (fileSortMode === 'ext') return (ea?.extension || '').localeCompare(eb?.extension || '');
      return 0;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const handleUpdateContainer = (id: string, updates: { name?: string, color?: string, icon?: string }) => {
    commitClassificationChange(prev => {
      if (!prev) return prev;
      const newContainers = prev.containers.map(c => 
        c.id === id ? { ...c, ...updates } : c
      );
      return { ...prev, containers: newContainers };
    }, `Contenedor actualizado`);
  };

  const handleDeleteContainer = (id: string, filesToMove: string[]) => {
    if (id === 'otros') return;
    commitClassificationChange(prev => {
      if (!prev) return prev;
      let newContainers = prev.containers.filter(c => c.id !== id);

      if (filesToMove.length > 0) {
        let otrosIdx = newContainers.findIndex(c => c.id === 'otros');
        if (otrosIdx === -1) {
          newContainers.push({ id: 'otros', name: 'cat_misc', files: [] });
          otrosIdx = newContainers.length - 1;
        }
        const merged = [...newContainers[otrosIdx].files];
        filesToMove.forEach(f => {
          if (!merged.includes(f)) merged.push(f);
        });
        newContainers[otrosIdx] = { ...newContainers[otrosIdx], files: merged };
      }

      return { ...prev, containers: newContainers };
    }, filesToMove.length > 0
      ? `${t('container_deleted')} — ${filesToMove.length} ${t('files')} → ${t('cat_misc')}`
      : t('container_deleted'));

    setExpandedContainers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (focusedContainerId === id) setFocusedContainerId(null);
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
      const otrosIdx = newContainers.findIndex(c => c.id === 'otros');
      if (otrosIdx !== -1) {
        newContainers.splice(otrosIdx, 0, newContainer);
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

  // Find the active file path for Overlay
  const activeFile = activeId ? activeId : '';
  const activeName = activeFile.split('/').pop();
  const draggingContainer = classification?.containers.find(c => c.id === activeId);

  const pieData = useMemo(() => {
    if (!classification) return [];
    
    const counts: Record<string, number> = {};
    classification.containers.forEach(c => {
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

    const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const isFiltering = tokens.length > 0 || filterType !== 'all';

    return {
      containers: classification.containers.map(c => {
        let filteredFiles = c.files.filter(filePath => {
          const fileEntry = scannedFiles.find(sf => sf.path === filePath);
          if (!matchesSearchTokens(filePath, fileEntry, tokens)) return false;
          if (!matchesFilterType(filePath, fileEntry, filterType, c.id)) return false;
          return true;
        });

        const sortedFiles = [...filteredFiles].sort((a, b) => {
          const aFav = localStorage.getItem(`favorite-${a}`) === 'true';
          const bFav = localStorage.getItem(`favorite-${b}`) === 'true';
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;
          return 0;
        });

        return { ...c, files: sortedFiles };
      }).filter(c => !isFiltering || c.files.length > 0 || groupBy === 'container')
    };
  }, [classification, scannedFiles, searchTerm, filterType, favoritesTick, groupBy]);

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
      <header className={`flex items-center border-b border-border-lite bg-surface-card px-8 shadow-sm z-20 shrink-0 transition-colors duration-200 ${step === 'editor' ? 'py-2 gap-4' : 'pt-6 pb-4 justify-between gap-3'}`}>
        <div className="flex items-center gap-4 shrink-0">
          <h1 className="font-bold text-text-primary">
            <span className={step === 'editor' ? 'text-xl' : 'text-[27px]'}>showroom</span>
          </h1>
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleLanguage} 
              className="px-2.5 py-1.5 rounded-lg hover:bg-surface-pill transition-colors text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold shrink-0"
              aria-label={language === 'es' ? t('switch_en') : t('switch_es')}
            >
              {language === 'es' ? 'English' : 'Español'}
            </button>
            <Tooltip content={t("dark_mode_toggle")}>
              <button 
                onClick={toggleDarkMode} 
                className="p-1.5 rounded-lg hover:bg-surface-pill transition-colors text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                aria-label={t("dark_mode_toggle")}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </Tooltip>
          </div>
        </div>

        {step === 'editor' && (
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="flex items-center gap-2 w-max ml-auto">
              <div className="flex items-center space-x-0.5 bg-surface-pill rounded-lg p-0.5 border border-border-lite shrink-0">
                <Tooltip content={t("undo_shortcut")}>
                  <button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label={t("undo_shortcut")}
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content={t("redo_shortcut")}>
                  <button
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-card disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label={t("redo_shortcut")}
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center rounded-md bg-surface-pill pl-2 pr-1 py-1 border border-border-lite shrink-0">
                <span className="mr-1.5 text-[10px] font-mono text-text-secondary hidden md:inline">{t("folder_label")}</span>
                <span className="text-xs font-medium text-text-primary truncate max-w-[80px] sm:max-w-[120px] mr-2">{folderName}</span>
                <button onClick={handleSelectFolder} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold px-1.5 py-1 rounded bg-surface-card border border-border-lite hover:bg-surface-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {t("change_btn")}
                </button>
              </div>

              <div className="hidden sm:block h-5 w-px bg-border-lite shrink-0" />

              <div className="flex items-center gap-1 shrink-0">
                <button onClick={expandAll} className="px-1.5 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-pill rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={t("expand_all_containers")}>{t("expand_all")}</button>
                <span className="text-border-heavy text-xs">|</span>
                <button onClick={collapseAll} className="px-1.5 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-pill rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={t("collapse_all_containers")}>{t("collapse_all")}</button>
              </div>

              <div className="relative w-36 sm:w-44 shrink-0">
                <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder={t("search_by_name")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-card border border-border-lite pl-7 pr-7 py-1.5 rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={t("search_by_name_aria")}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                    aria-label={t("clear_search")}
                    title={t("clear_search")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="relative shrink-0">
                <Filter className="w-3.5 h-3.5 text-text-secondary absolute left-2 top-1/2 -translate-y-1/2" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="appearance-none bg-surface-card border border-border-lite pl-7 pr-6 py-1.5 rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  aria-label={t("filter_by_type")}
                >
                  <option value="all">{t("types_all")}</option>
                  <option value="favorites">{t("types_favorites")}</option>
                  <option value="image">{t("types_images")}</option>
                  <option value="document">{t("types_documents")}</option>
                  <option value="code">{t("types_code")}</option>
                  <option value="multimedia">{t("types_multimedia")}</option>
                  <option value="compressed">{t("types_compressed")}</option>
                  <option value="executable">{t("types_executables")}</option>
                  <option value="other">{t("types_other")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-text-secondary">
                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>

              <div className="relative shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-text-secondary absolute left-2 top-1/2 -translate-y-1/2" />
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
                  className="appearance-none bg-surface-card border border-border-lite pl-7 pr-6 py-1.5 rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  aria-label={t("group_by")}
                >
                  <option value="none">{t("group_by_none")}</option>
                  <option value="extension">{t("group_by_extension")}</option>
                  <option value="container">{t("group_by_container")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-text-secondary">
                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>

              <Tooltip content={t("view_stats")}>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`p-1.5 rounded-lg border border-border-lite transition-colors shrink-0 ${showDashboard ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-surface-card text-text-secondary hover:text-text-primary'}`}
                  aria-label={t("view_stats")}
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className={`flex-1 flex flex-col items-center w-full max-w-7xl mx-auto ${step === 'editor' ? 'px-8 py-3 justify-start min-h-0' : 'px-8 py-6 justify-center'}`}>
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
                <p className="text-text-secondary text-lg mb-6">{t("hero_subtitle")}</p>
                <ul className="text-left text-sm text-text-secondary space-y-2 max-w-md mx-auto">
                  <li className="flex items-start gap-2">
                    <Monitor className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <span>{t("hero_bullet_desktop")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <span>{t("hero_bullet_local")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Globe className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <span>{t("hero_bullet_safe")}</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-6">
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
                  {isEmbeddedFrame() && (
                    <p className="text-center text-xs text-text-secondary mt-2 opacity-80">
                      {t("select_dir_fallback")}
                    </p>
                  )}
                  {!isEmbeddedFrame() && savedSessions.length > 0 && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-indigo-500/10">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{t("recent_sessions")}</p>
                      {[...savedSessions]
                        .sort((a, b) => (a.folderName || '').localeCompare(b.folderName || '', undefined, { sensitivity: 'base' }))
                        .map((session, index) => (
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
                {errorMsg && <p className="text-red-500 text-sm mt-3 flex items-center justify-center gap-1"><ArrowRight className="w-4 h-4"/> {errorMsg}</p>}
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
              className="w-full h-full flex flex-col min-h-0 flex-1"
            >
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

              <div className="flex-1 w-full overflow-hidden pb-6 pt-3">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    {viewMode === 'grid' ? (
                      <div className="flex w-full h-full gap-4 px-1 pt-1">
                         <div className="w-1/4 min-w-[188px] max-w-[263px] flex flex-col gap-2 overflow-y-auto pl-1 pr-3 pt-1 custom-scrollbar pb-6 relative z-10 text-left">
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
                                    isFocused={isActive}
                                    isFileDragActive={activeId !== null && !draggingContainer}
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
                                         headerRenderer={(isOver) => (
                                           <div className={`px-6 py-4 border-b border-border-lite shadow-sm z-10 flex items-center justify-between transition-colors ${isOver ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-surface-base'}`}>
                                             <h3 className="font-bold text-xl text-text-primary flex items-center gap-2">
                                                {renderIcon(focusedContainer.icon, focusedContainer.color, 'w-6 h-6')}
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
                                                      setFocusedContainerEditName(focusedContainer.name);
                                                      setEditingFocusedContainerId(focusedContainer.id);
                                                    }}
                                                    title={t("click_to_rename")}
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
                                                <button
                                                  onClick={() => setCustomizeContainerId(focusedContainer.id)}
                                                  className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1"
                                                  title={t("configure")}
                                                  aria-label={t("configure")}
                                                >
                                                  <Settings className="w-4 h-4 text-text-secondary" />
                                                  <span className="text-xs font-semibold text-text-secondary hidden sm:inline">{t("configure")}</span>
                                                </button>
                                                <button onClick={() => {
                                                  setFocusedContainerEditName(focusedContainer.name);
                                                  setEditingFocusedContainerId(focusedContainer.id);
                                                }} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors" title={t("rename_container")}>
                                                  <span className="text-xs font-semibold text-text-secondary">{t("rename")}</span>
                                                </button>
                                                {focusedContainer.id.startsWith('custom-') && (
                                                  <button onClick={() => {
                                                    requireConfirm(t('delete_container_q') || '¿Eliminar contenedor?', () => handleDeleteContainer(focusedContainer.id, focusedContainer.files));
                                                  }} className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors" title={t("delete_container")}>
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                )}
                                             </div>
                                           </div>
                                         )}
                                       >
                                          {(() => {
                                            const sortedFiles = sortFilesForDisplay(focusedContainer.files);
                                            const extensionGroups = groupBy === 'extension'
                                              ? (() => {
                                                  const map = new Map<string, string[]>();
                                                  sortedFiles.forEach(f => {
                                                    const entry = scannedFiles.find(sf => sf.path === f);
                                                    const ext = (entry?.extension || '—').toLowerCase() || '—';
                                                    if (!map.has(ext)) map.set(ext, []);
                                                    map.get(ext)!.push(f);
                                                  });
                                                  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                                                })()
                                              : null;
                                            const previewEntry = activePreviewPath
                                              ? scannedFiles.find(sf => sf.path === activePreviewPath) || null
                                              : null;
                                            const entriesByPath = new Map(scannedFiles.map(sf => [sf.path, sf]));
                                            const selectedPaths = selectedFiles.size > 0
                                              ? Array.from(selectedFiles)
                                              : (activePreviewPath ? [activePreviewPath] : []);
                                            return (
                                              <div className="flex flex-1 min-h-0 overflow-hidden">
                                                <div className="w-[38%] min-w-[200px] max-w-[420px] flex flex-col border-r border-border-lite min-h-0">
                                                  <div className="shrink-0 px-3 py-2 border-b border-border-lite flex items-center gap-2 bg-surface-base/50">
                                                    <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide shrink-0" htmlFor="file-sort-select">{t('sort_by')}</label>
                                                    <select
                                                      id="file-sort-select"
                                                      value={fileSortMode}
                                                      onChange={(e) => setFileSortMode(e.target.value as FileSortMode)}
                                                      className="flex-1 text-xs bg-surface-card border border-border-lite rounded-md px-2 py-1 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                      aria-label={t('sort_by')}
                                                    >
                                                      <option value="favorites">{t('sort_favorites')}</option>
                                                      <option value="name_asc">{t('sort_name_asc')}</option>
                                                      <option value="name_desc">{t('sort_name_desc')}</option>
                                                      <option value="date">{t('sort_date')}</option>
                                                      <option value="size">{t('sort_size')}</option>
                                                      <option value="ext">{t('sort_ext')}</option>
                                                    </select>
                                                  </div>
                                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
                                                    <SortableContext items={sortedFiles} strategy={verticalListSortingStrategy}>
                                                      <div className="flex flex-col gap-2 pb-8" data-files-grid="true">
                                                        {extensionGroups ? extensionGroups.map(([ext, groupFiles]) => (
                                                          <div key={ext} className="flex flex-col gap-1.5">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary px-1 sticky top-0 bg-surface-base/90 py-1">
                                                              .{ext} <span className="font-mono font-normal opacity-70">({groupFiles.length})</span>
                                                            </p>
                                                            {groupFiles.map((file, fileIdx) => (
                                                              <FileItem
                                                                key={file}
                                                                id={file}
                                                                index={fileIdx}
                                                                file={file}
                                                                containerId={focusedContainer.id}
                                                                fileEntry={scannedFiles.find(sf => sf.path === file)}
                                                                isSelected={selectedFiles.has(file)}
                                                                isActivePreview={activePreviewPath === file}
                                                                isGroupDragging={activeId !== null && selectedFiles.has(activeId) && selectedFiles.has(file)}
                                                                onClick={handleFileClick}
                                                                onFavoriteToggle={handleFavoriteToggle}
                                                                onDoubleClick={handleFileDoubleClick}
                                                                dropFeedback={fileDropFeedback[file]}
                                                                compact
                                                              />
                                                            ))}
                                                          </div>
                                                        )) : sortedFiles.map((file, fileIdx) => (
                                                          <FileItem
                                                            key={file}
                                                            id={file}
                                                            index={fileIdx}
                                                            file={file}
                                                            containerId={focusedContainer.id}
                                                            fileEntry={scannedFiles.find(sf => sf.path === file)}
                                                            isSelected={selectedFiles.has(file)}
                                                            isActivePreview={activePreviewPath === file}
                                                            isGroupDragging={activeId !== null && selectedFiles.has(activeId) && selectedFiles.has(file)}
                                                            onClick={handleFileClick}
                                                            onFavoriteToggle={handleFavoriteToggle}
                                                            onDoubleClick={handleFileDoubleClick}
                                                            dropFeedback={fileDropFeedback[file]}
                                                            compact
                                                          />
                                                        ))}
                                                        {sortedFiles.length === 0 && (
                                                          <div className="py-16 flex flex-col items-center justify-center opacity-50">
                                                            <FolderOpen className="w-16 h-16 text-text-secondary mb-4" />
                                                            <p className="text-sm text-text-secondary font-medium">{t("empty_container")}</p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </SortableContext>
                                                  </div>
                                                </div>
                                                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                                                  <FilePreviewPane
                                                    fileEntry={previewEntry}
                                                    name={previewEntry?.name}
                                                    className="flex-1 min-h-0 border-b border-border-lite"
                                                  />
                                                  <FilePropertiesPanel
                                                    entry={previewEntry}
                                                    selectedPaths={selectedPaths}
                                                    entriesByPath={entriesByPath}
                                                    containerId={focusedContainer.id}
                                                    className="shrink-0 max-h-[40%] min-h-[120px]"
                                                    app={{
                                                      toggleFavorite: (path) => {
                                                        const key = `favorite-${path}`;
                                                        if (localStorage.getItem(key) === 'true') localStorage.removeItem(key);
                                                        else localStorage.setItem(key, 'true');
                                                        handleFavoriteToggle();
                                                      },
                                                      showToast: (msg) => setRecentAction({ message: msg, timestamp: Date.now(), type: 'normal' }),
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })()}
                                       </DetailDroppableArea>
                                    </motion.div>
                                  </AnimatePresence>
                                )
                             })()}
                         </div>
                      </div>
                    ) : (
                      <div className="flex gap-6 h-full overflow-x-auto pt-3 pb-4 px-1 custom-scrollbar items-start">
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
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {step === 'input' && (
        <footer className="text-center py-4 text-xs text-text-secondary border-t border-border-lite mt-auto bg-surface-card z-10">
          {t("developed_by")}
        </footer>
      )}

      <input
        type="file"
        {...{ webkitdirectory: "", directory: "" }}
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFallbackSelectFolder}
      />
    </div>
  );
}

