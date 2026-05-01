/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Target, CheckCircle2, MessageSquare, Tag as TagIcon, MoreVertical } from 'lucide-react';
import { Vision } from '../../types';
import { cn } from '../../lib/utils';
import { useState, useEffect, type FormEvent } from 'react';
import { useStore } from '../../store/useStore';

interface VisionCardProps {
  vision: Vision;
  onClick: () => void;
  className?: string;
  gridSpan?: 'small' | 'medium' | 'large';
  orientation?: 'vertical' | 'horizontal';
  isSquare?: boolean;
  key?: string | number;
}

export default function VisionCard({ 
  vision, 
  onClick, 
  className, 
  gridSpan = 'medium', 
  orientation = 'vertical',
  isSquare = false 
}: VisionCardProps) {
  const completedTasks = vision.tasks.filter(t => t.completed).length;
  const totalTasks = vision.tasks.length;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(vision.title);
  const { updateVision } = useStore();

  useEffect(() => {
    setEditedTitle(vision.title);
    setIsEditingTitle(false);
  }, [vision.id, vision.title]);

  const handleTitleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateVision(vision.id, { title: editedTitle });
    setIsEditingTitle(false);
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "group relative system-card p-6 sm:p-8 cursor-pointer transition-all duration-700 overflow-hidden",
        orientation === 'horizontal' ? "flex flex-row items-center gap-8 min-h-[160px]" : "flex flex-col justify-between",
        isSquare && orientation === 'vertical' && "aspect-square",
        className
      )}
      style={!isSquare && orientation === 'vertical' ? { gridRowEnd: gridSpan === 'small' ? 'span 22' : gridSpan === 'large' ? 'span 38' : 'span 30' } : {}}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-mesh opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none group-hover:rotate-2 duration-1000" />

      <div className={cn("relative z-10 flex flex-col", orientation === 'horizontal' ? "flex-1" : "flex-1")}>
        <div className={cn("flex justify-between items-start", (orientation === 'horizontal' || isSquare) ? "mb-2" : "mb-6")}>
          <div className="flex flex-wrap gap-1.5">
            {vision.tags.slice(0, isSquare ? 1 : 2).map((tag, i) => (
              <span key={`${tag}-${i}`} className="text-[9px] font-black uppercase tracking-wider text-text-secondary/60 border border-card-border bg-accent/5 px-2.5 py-0.5 rounded-lg group-hover:text-accent group-hover:border-accent/20 transition-all">
                {tag}
              </span>
            ))}
          </div>
          {orientation === 'vertical' && !isSquare && (
            <div className="w-9 h-9 rounded-xl bg-bg-base border border-card-border flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-accent-contrast group-hover:border-accent transition-all duration-700 shadow-xl">
               <Target size={14} strokeWidth={2} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isEditingTitle ? (
             <form onSubmit={handleTitleSubmit} className="relative z-20" onClick={e => e.stopPropagation()}>
               <input
                 autoFocus
                 className="w-full bg-transparent border-b border-accent text-lg font-black tracking-tighter focus:outline-none text-text-main pb-1"
                 value={editedTitle}
                 onChange={(e) => setEditedTitle(e.target.value)}
                 onBlur={handleTitleSubmit}
               />
             </form>
          ) : (
            <h3
              className={cn(
                "font-bold leading-[1.3] text-text-main group-hover:text-accent font-display transition-colors tracking-tight uppercase",
                isSquare ? "text-sm" : (orientation === 'horizontal' ? "text-xl" : "text-lg")
              )}
              onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
            >
              {vision.title}
            </h3>
          )}

          {!isSquare && (
            <div>
              {vision.description && (
                <p className={cn("text-[11px] text-text-secondary line-clamp-2 leading-relaxed font-medium mt-1", orientation === 'horizontal' ? "max-w-md" : "")}>
                  {vision.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        "relative z-10 space-y-4", 
        orientation === 'horizontal' ? "w-72 pl-8 border-l border-card-border" : (isSquare ? "mt-4 pt-4 border-t border-card-border/50" : "mt-6 pt-6 border-t border-card-border")
      )}>
        <div className="space-y-3">
            {!isSquare && (
              <div className="flex justify-between items-end">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Milestone Status</p>
                    <p className="text-[10px] font-semibold text-text-main uppercase tracking-widest">Phase {Math.floor(vision.progress / 33) + 1} / 04</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">Progress</p>
                    <p className="text-lg font-bold text-accent tabular-nums leading-none">{vision.progress}%</p>
                  </div>
              </div>
            )}
            
            <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden border border-card-border/50">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vision.progress}%` }}
                    className="h-full bg-accent rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]"
                />
            </div>
            
            {isSquare && (
               <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary opacity-40">{vision.status}</p>
                  <p className="text-[11px] font-black text-accent">{vision.progress}%</p>
               </div>
            )}
        </div>

        {!isSquare && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  completedTasks === totalTasks && totalTasks > 0 ? "bg-success shadow-[0_0_8px_rgba(var(--accent-rgb),0.35)]" : "bg-text-secondary/20 shadow-inner"
                )} />
                <span className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">
                  {completedTasks}/{totalTasks} Objectives
                </span>
              </div>
            </div>
            {orientation === 'vertical' && (
              <div className="text-[8px] font-black text-text-secondary uppercase tracking-[0.2em] font-mono opacity-20">
                {vision.id.slice(0, 4)}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
