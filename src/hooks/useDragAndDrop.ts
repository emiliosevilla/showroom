import { useState, Dispatch, SetStateAction } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ClassificationResult } from '../services/classifier';
import { TranslationKey } from '../i18n/translations';

export type FileDropFeedback = Record<string, 'success-normal' | 'success-trash' | 'abort'>;

export interface UseDragAndDropParams {
  t: (key: TranslationKey, ...args: (string | number)[]) => string;
  classification: ClassificationResult | null;
  commitClassificationChange: (
    updater: ClassificationResult | ((prev: ClassificationResult | null) => ClassificationResult | null),
    actionDesc?: string
  ) => void;
  selectedFiles: Set<string>;
  setSelectedFiles: Dispatch<SetStateAction<Set<string>>>;
  focusedContainerId: string | null;
  setFocusedContainerId: Dispatch<SetStateAction<string | null>>;
  setTrashOriginalLocations: Dispatch<SetStateAction<Record<string, string>>>;
}

export interface UseDragAndDropReturn {
  sensors: ReturnType<typeof useSensors>;
  activeId: string | null;
  fileDropFeedback: FileDropFeedback;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

export function useDragAndDrop({
  t,
  classification,
  commitClassificationChange,
  selectedFiles,
  setSelectedFiles,
  focusedContainerId,
  setFocusedContainerId,
  setTrashOriginalLocations,
}: UseDragAndDropParams): UseDragAndDropReturn {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fileDropFeedback, setFileDropFeedback] = useState<FileDropFeedback>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    setActiveId(draggedId);

    if (event.active.data.current?.type === 'container' || event.active.data.current?.type === 'container-list-item') {
      return;
    }

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

      // Sidebar boxes use a 0.5s hover dwell in SplitMasterItem — do not switch focus here.
      if (over.data.current?.type === 'container-list-item') {
        return;
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

  return {
    sensors,
    activeId,
    fileDropFeedback,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
