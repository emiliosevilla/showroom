import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export const DetailDroppableArea = ({ containerId, headerRenderer, children }: { containerId: string, headerRenderer?: (isOver: boolean) => React.ReactNode, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `detail-${containerId}`,
    data: { type: 'detail-droppable', containerId }
  });
  return (
    <div ref={setNodeRef} className="flex-1 flex flex-col min-h-0 relative">
      {headerRenderer && headerRenderer(isOver)}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors ${isOver ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-surface-base/30'}`}>
         {children}
      </div>
    </div>
  );
};

export const GridDroppableArea = ({ containerId, children }: { containerId: string, children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${containerId}`,
    data: { type: 'grid-droppable', containerId }
  });
  return (
    <div ref={setNodeRef} className={`flex-1 overflow-y-auto space-y-2 fallback-scroll pr-1 p-2 rounded-xl transition-colors ${isOver ? 'bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-inset scale-[1.01]' : ''}`}>
      {children}
    </div>
  );
};
