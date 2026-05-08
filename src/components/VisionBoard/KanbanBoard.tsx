/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Vision } from '../../types';
import { useStore } from '../../store/useStore';
import VisionCard from './VisionCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

const COLUMNS: { id: Vision['status']; label: string }[] = [
  { id: 'idea', label: 'Backlog' },
  { id: 'planning', label: 'Planning' },
  { id: 'in-progress', label: 'Execution' },
  { id: 'completed', label: 'Success' },
];

interface KanbanColumnProps {
  id: Vision['status'];
  label: string;
  visions: Vision[];
  onCardClick: (vision: Vision) => void;
}

function KanbanCard({ vision, onClick }: { vision: Vision, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: vision.id,
    data: {
      type: 'Vision',
      vision,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="touch-none cursor-grab active:cursor-grabbing outline-none"
    >
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ 
          layout: { duration: 0.2, ease: "easeOut" },
          opacity: { duration: 0.2 }
        }}
      >
        <VisionCard
          vision={vision}
          onClick={onClick}
          className="mb-1"
          gridSpan="small"
        />
      </motion.div>
    </div>
  );
}

function Column({ id, label, visions, onCardClick, isDraggingSomething }: KanbanColumnProps & { isDraggingSomething: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'Column',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-full min-w-[340px] h-full rounded-[2.5rem] bg-card border border-card-border p-4 overflow-hidden relative shadow-sm transition-all duration-300",
        isOver && "bg-accent/5 ring-2 ring-accent/20 border-accent/30 shadow-xl -translate-y-1",
        isDraggingSomething && !isOver && "opacity-70 grayscale-[0.2]"
      )}
    >
      <div className="flex items-center justify-between p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-500",
            isOver ? "bg-accent scale-125 shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" : "bg-accent/40"
          )} />
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-main">{label}</h3>
          <span className="bg-bg-base text-text-main text-[9px] font-black px-2.5 py-1 rounded-full border border-card-border/50">
            {visions.length}
          </span>
        </div>
        <button className="text-text-secondary/40 hover:text-text-main p-2 hover:bg-surface-muted rounded-full transition-all border border-transparent">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto px-2 custom-scrollbar space-y-4 pb-20 transition-colors duration-300",
        isOver && "bg-accent/[0.02]"
      )}>
        <SortableContext items={visions.map(v => v.id)} strategy={verticalListSortingStrategy}>
          <div className="min-h-[200px]">
            {visions.map(v => (
              <KanbanCard key={v.id} vision={v} onClick={() => onCardClick(v)} />
            ))}
          </div>
        </SortableContext>

        {visions.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-card-border rounded-[2rem] p-8 opacity-40 text-center bg-surface-muted/20"
          >
             <div className="w-10 h-10 rounded-full bg-accent/5 flex items-center justify-center text-accent mb-4">
                <Plus size={20} />
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight text-text-secondary">Release to Assign</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ onCardClick }: { onCardClick: (vision: Vision) => void }) {
  const { visions, moveVision, reorderVisions } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeVision, setActiveVision] = useState<Vision | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveVision(event.active.data.current?.vision);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeVision = visions.find(v => v.id === activeId);
    if (!activeVision) return;

    // Check if we are over a column directly or over another card
    const overColumn = COLUMNS.find(c => c.id === overId);
    const overVision = visions.find(v => v.id === overId);

    if (overColumn) {
      if (activeVision.status !== overColumn.id) {
        moveVision(activeId, overColumn.id);
      }
    } else if (overVision) {
      if (activeVision.status !== overVision.status) {
        moveVision(activeId, overVision.status);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveVision(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeVision = visions.find(v => v.id === activeId);
    const overVision = visions.find(v => v.id === overId);

    if (activeVision && overVision && activeVision.status === overVision.status) {
      const oldIndex = visions.findIndex(v => v.id === activeId);
      const newIndex = visions.findIndex(v => v.id === overId);
      if (oldIndex !== newIndex) {
        const newVisions = arrayMove(visions, oldIndex, newIndex);
        reorderVisions(newVisions);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-250px)] flex gap-6 overflow-x-auto pb-4 custom-scrollbar px-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map(column => (
          <Column
            key={column.id}
            id={column.id}
            label={column.label}
            visions={visions.filter(v => v.status === column.id)}
            onCardClick={onCardClick}
            isDraggingSomething={!!activeId}
          />
        ))}

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
          {activeVision ? (
            <div className="w-[320px] pointer-events-none rotate-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
              <VisionCard vision={activeVision} onClick={() => {}} gridSpan="small" className="border-accent/40" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
