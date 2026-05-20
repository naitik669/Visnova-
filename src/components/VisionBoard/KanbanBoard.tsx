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
import { Plus, MoreHorizontal, CheckCircle2, Circle, Filter } from 'lucide-react';
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
  const completedTasks = vision.tasks.filter(task => task.completed).length;
  const totalTasks = vision.tasks.length;
  const progress = Math.max(0, Math.min(100, vision.progress || (totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0)));
  const palette = [
    'bg-[#E7F0FF] border-[#C8DAFF] text-[#315A9C]',
    'bg-[#FFF0D8] border-[#F5D8A5] text-[#8A5A13]',
    'bg-[#E4F8EF] border-[#BEEAD3] text-[#236B4A]',
    'bg-[#F3E9FF] border-[#DDC8FF] text-[#6D3C9B]',
    'bg-[#FFE4E5] border-[#F6C4C8] text-[#9B3C45]'
  ];
  const colorClass = palette[vision.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
  const progressDots = Array.from({ length: 10 }, (_, index) => index < Math.round(progress / 10));

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
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={cn(
            "mb-3 w-full rounded-[1.35rem] border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
            colorClass
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1">
              {(vision.tags.length ? vision.tags : [vision.category || 'vision']).slice(0, 2).map(tag => (
                <span key={tag} className="rounded-md bg-white/55 px-2 py-1 text-[8px] font-black uppercase tracking-widest">
                  #{tag}
                </span>
              ))}
            </div>
            <MoreHorizontal size={14} className="shrink-0 opacity-45" />
          </div>
          <h4 className="mt-3 line-clamp-2 text-[14px] font-black leading-tight text-current">{vision.title}</h4>
          <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-relaxed opacity-70">{vision.description || vision.notes || 'Build this Vision one move at a time.'}</p>
          {vision.tasks.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {vision.tasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-2 text-[10px] font-bold opacity-80">
                  {task.completed ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  <span className={cn("line-clamp-1", task.completed && "line-through opacity-60")}>{task.text}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-70">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="flex gap-1">
              {progressDots.map((filled, index) => (
                <span key={index} className={cn("h-2 flex-1 rounded-full bg-white/50", filled && "bg-current")} />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-65">
            <span>{completedTasks}/{totalTasks || 0} tasks</span>
            <span>{vision.deadline ? 'Deadline set' : 'No deadline'}</span>
          </div>
        </button>
      </motion.div>
    </div>
  );
}

function Column({ id, label, visions, onCardClick, isDraggingSomething, onAddVision }: KanbanColumnProps & { isDraggingSomething: boolean; onAddVision: (status: Vision['status']) => void }) {
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
        "flex flex-col w-full min-w-[260px] max-w-[292px] h-full rounded-[1.5rem] bg-card border border-card-border p-3 overflow-hidden relative shadow-sm transition-all duration-300",
        isOver && "bg-accent/5 ring-2 ring-accent/20 border-accent/30 shadow-xl -translate-y-1",
        isDraggingSomething && !isOver && "opacity-70 grayscale-[0.2]"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full transition-all duration-500",
            isOver ? "bg-accent scale-125 shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" : "bg-accent/40"
          )} />
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-main">{label}</h3>
          <span className="bg-bg-base text-text-main text-[9px] font-black px-2.5 py-1 rounded-full border border-card-border/50">
            {visions.length}
          </span>
        </div>
        <button onClick={() => onAddVision(id)} className="text-text-secondary/40 hover:text-text-main p-1.5 hover:bg-surface-muted rounded-full transition-all border border-transparent">
          <Plus size={14} />
        </button>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto px-1 custom-scrollbar space-y-3 pb-12 transition-colors duration-300",
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
            className="flex h-40 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-card-border bg-surface-muted/20 p-6 text-center opacity-45"
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
  const { visions, moveVision, reorderVisions, addVision, addToast } = useStore();
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

  const handleAddVision = async (status: Vision['status']) => {
    try {
      const created = await addVision({
        title: 'New Vision',
        description: 'Shape this into your next move.',
        status,
        tags: ['vision']
      });
      addToast({ type: 'success', title: 'Vision created', description: 'Open it to add tasks, board items, and proof.' });
      onCardClick(created);
    } catch (error) {
      console.error('Kanban vision create failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-card-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-accent">Board</p>
          <h3 className="text-lg font-black text-text-main">Daily Vision Tasks</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center -space-x-2 sm:flex">
            {visions.slice(0, 5).map(vision => (
              <img key={vision.id} src={`https://api.dicebear.com/7.x/shapes/svg?seed=${vision.id}`} className="h-7 w-7 rounded-full border-2 border-card bg-surface-muted" alt="" />
            ))}
          </div>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-card-border bg-bg-base px-3 text-[10px] font-black uppercase tracking-widest text-text-secondary">
            <Filter size={13} /> Filters
          </button>
          <button onClick={() => handleAddVision('planning')} className="flex h-10 items-center gap-2 rounded-xl bg-text-main px-3 text-[10px] font-black uppercase tracking-widest text-bg-base">
            <Plus size={13} /> Create Vision
          </button>
        </div>
      </div>
      <div className="flex h-[calc(100vh-310px)] gap-4 overflow-x-auto pb-4 custom-scrollbar px-1">
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
            onAddVision={handleAddVision}
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
            <div className="w-[270px] pointer-events-none rotate-3 rounded-[1.35rem] border border-accent/30 bg-card p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent">Moving Vision</p>
              <h4 className="mt-2 line-clamp-2 text-sm font-black text-text-main">{activeVision.title}</h4>
              <p className="mt-2 text-xs font-semibold text-text-secondary/65">{activeVision.progress}% complete</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>
    </div>
  );
}
