/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Plus,
  Trash2,
  Image as ImageIcon,
  Target,
  Type,
  Link as LinkIcon,
  Smile,
  ChevronRight,
  PlusCircle,
  FileText,
  GripVertical,
  Sparkles,
  Users,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Quote,
  CheckSquare,
  Box,
  Share2,
  Zap,
  ExternalLink,
  ChevronDown,
  Cloud,
  History,
  MoreVertical,
  MousePointer2,
  Globe,
  UserPlus,
  Wallet
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Vision, Task, VisionElement, Note } from '../../types';
import { useStore } from '../../store/useStore';
import React, { useState, useEffect, useRef, type FormEvent } from 'react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { CreativeCanvas } from './CreativeCanvas';
import PublishModal from './PublishModal';
import CollaborateModal from './CollaborateModal';
import { supabase, uploadVisionBoardImage } from '../../lib/supabase';
import { safeArray } from '../../lib/safeData';

interface VisionDetailModalProps {
  vision: Vision | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'board' | 'milestones';

// Add save status type
type SaveStatus = 'idle' | 'saving' | 'saved';

function SortableTaskItem({ task, index, onToggle, onAddSubTask, isLast, onUpdatePriority, onUpdateText, onUpdateDescription, onDeleteTask, onUpdateSubTaskText, onDeleteSubTask }: {
  task: Task,
  index: number,
  onToggle: (id: string) => void,
  onAddSubTask: (parentId: string, text: string) => void,
  isLast: boolean,
  onUpdatePriority: (id: string, priority: 'low' | 'medium' | 'high') => void,
  onUpdateText: (id: string, text: string) => void,
  onUpdateDescription: (id: string, description: string) => void,
  onDeleteTask: (id: string) => void,
  onUpdateSubTaskText: (parentId: string, subTaskId: string, text: string) => void,
  onDeleteSubTask: (parentId: string, subTaskId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draftText, setDraftText] = useState(task.text);
  const [draftDescription, setDraftDescription] = useState(task.description || '');

  useEffect(() => {
    setDraftText(task.text);
    setDraftDescription(task.description || '');
  }, [task.text, task.description]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAddSubTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = window.prompt(`Add sub-task for "${task.text}":`);
    if (text) onAddSubTask(task.id, text);
  };

  const priorityLabels = {
    low: "Later",
    medium: "Next",
    high: "Now"
  };

  return (
    <div ref={setNodeRef} style={style} className="relative grid grid-cols-[2.25rem_2.25rem_minmax(0,1fr)] gap-4 group">
      <div className="pt-1 text-right text-sm font-black tabular-nums text-text-secondary/55">{index + 1}</div>
      <div className="relative flex justify-center">
        {!isLast && <div className="absolute top-9 bottom-[-1.5rem] w-0.5 rounded-full bg-accent/35" />}
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-card transition-all",
            task.completed ? "border-success bg-success text-accent-contrast" : "border-accent/35 text-accent hover:border-accent hover:bg-accent/10"
          )}
          aria-label={task.completed ? 'Mark roadmap step incomplete' : 'Mark roadmap step complete'}
        >
          {task.completed ? <CheckCircle2 size={18} /> : <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
        </button>
      </div>

      <div
        className={cn(
          "min-w-0 rounded-[1.5rem] border bg-card/95 p-4 shadow-sm transition-all",
          task.completed
            ? "border-card-border/50 opacity-65"
            : "border-card-border hover:border-accent/35 hover:shadow-xl hover:shadow-accent/5"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const next: Record<string, 'low' | 'medium' | 'high'> = { low: 'medium', medium: 'high', high: 'low' };
                  onUpdatePriority(task.id, next[task.priority || 'low'] as any);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all",
                  task.priority === 'high' ? "border-danger/25 bg-danger/10 text-danger" :
                  task.priority === 'medium' ? "border-warning/25 bg-warning/10 text-warning" :
                  "border-card-border bg-app-container text-text-secondary"
                )}
              >
                {priorityLabels[task.priority || 'low']}
              </button>
              {task.subTasks && task.subTasks.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="flex items-center gap-1 rounded-full border border-card-border bg-app-container px-3 py-1 text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent"
                >
                  {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
                </button>
              )}
            </div>
            <input
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              onBlur={() => {
                const next = draftText.trim();
                if (next && next !== task.text) onUpdateText(task.id, next);
                if (!next) setDraftText(task.text);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                event.stopPropagation();
              }}
              onClick={(event) => event.stopPropagation()}
              className={cn("w-full bg-transparent text-xl font-black tracking-tight text-text-main outline-none placeholder:text-text-secondary/30", task.completed && "line-through opacity-60")}
            />
            <textarea
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              onBlur={() => {
                const next = draftDescription.trim();
                if (next !== (task.description || '')) onUpdateDescription(task.id, next);
              }}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              placeholder="Describe this step, proof needed, or next move..."
              rows={2}
              className={cn("mt-2 w-full resize-none bg-transparent text-sm font-semibold leading-relaxed text-text-secondary outline-none placeholder:text-text-secondary/35", task.completed && "opacity-60")}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              {...attributes}
              {...listeners}
              className="touch-none grid h-9 w-9 place-items-center rounded-xl text-text-secondary/35 hover:bg-app-container hover:text-accent cursor-grab active:cursor-grabbing"
              aria-label="Reorder roadmap step"
            >
              <GripVertical size={16} />
            </button>
            <button
              onClick={handleAddSubTask}
              className="grid h-9 w-9 place-items-center rounded-xl text-accent hover:bg-accent hover:text-accent-contrast"
              aria-label="Add checklist item"
            >
              <Plus size={17} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDeleteTask(task.id);
              }}
              className="grid h-9 w-9 place-items-center rounded-xl text-danger hover:bg-danger hover:text-white"
              aria-label="Delete roadmap item"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && task.subTasks && task.subTasks.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 overflow-hidden border-t border-card-border pt-3"
            >
              {task.subTasks.map((subTask, sIdx) => (
                <div
                  key={subTask.id || sIdx}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-card-border/60 bg-app-container px-3 py-2",
                    subTask.completed && "opacity-55"
                  )}
                >
                  <button
                    onClick={() => onToggle(subTask.id)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                      subTask.completed ? "bg-success border-success" : "border-card-border hover:border-accent"
                    )}
                  >
                    {subTask.completed && <CheckCircle2 size={11} className="text-accent-contrast" />}
                  </button>
                  <input
                    value={subTask.text}
                    onChange={(event) => onUpdateSubTaskText(task.id, subTask.id, event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    className={cn("min-w-0 flex-1 bg-transparent text-xs font-bold text-text-secondary outline-none", subTask.completed && "line-through")}
                  />
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSubTask(task.id, subTask.id);
                    }}
                    className="grid h-7 w-7 place-items-center rounded-lg text-text-secondary/40 hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete checklist item"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function VisionDetailModal({ vision, isOpen, onClose }: VisionDetailModalProps) {
  const { updateVision, deleteVision, notes, addNote, shareVision, addPost, session, addToast } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(vision?.title || '');
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [history, setHistory] = useState<VisionElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveTimeout = useRef<any>(null);
  const imageImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new Event('visnova-vision-board-open'));
    return () => {
      window.dispatchEvent(new Event('visnova-vision-board-closed'));
    };
  }, [isOpen]);

  useEffect(() => {
    if (vision && historyIndex === -1) {
      setHistory([vision.elements || []]);
      setHistoryIndex(0);
    }
  }, [vision?.id]);

  const handleUpdateElements = (newElements: VisionElement[]) => {
    if (!vision) return;
    
    setSaveStatus('saving');
    updateVision(vision.id, { elements: newElements });

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setSaveStatus('saved');
      
      // Update history for undo/redo
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, 1000);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || activeTab !== 'board') return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if (isMod && e.key === 'd') {
        e.preventDefault();
        // Duplicate selected Logic
      }
      if (e.key === 'Space') {
        // Space pan mode logic
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0 && vision) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      updateVision(vision.id, { elements: prev });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && vision) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      updateVision(vision.id, { elements: next });
    }
  };

  const addElement = (type: VisionElement['type'], content: string = '', metadata: any = {}) => {
    if (!vision) return;
    const defaults: Partial<Record<VisionElement['type'], string>> = {
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200',
      link: 'https://example.com',
      note: 'Checklist item\nNext step\nProof to collect',
      quote: 'The future is built in small daily proofs.'
    };
    const newElement: VisionElement = {
      id: Math.random().toString(36).substring(7),
      type,
      content: content || defaults[type] || '',
      x: 2500 + (Math.random() * 200 - 100), // Center of the 5000x5000 canvas
      y: 2500 + (Math.random() * 200 - 100),
      scale: 1,
      rotation: 0,
      metadata
    };
    handleUpdateElements([...(vision.elements || []), newElement]);
  };

  const importImageFile = async (file: File) => {
    if (!vision) return;
    try {
      const { publicUrl, filePath } = await uploadVisionBoardImage(file, vision.id, session?.user?.id);
      addElement('image', publicUrl, { title: file.name, imageUrl: publicUrl, storagePath: filePath });
      addToast({ type: 'success', title: 'Image added', description: 'Vision Board image uploaded.' });
    } catch (error: any) {
      console.error('Vision Board image import failed:', error);
      addToast({ type: 'error', title: 'Image failed', description: error.message || 'Could not add this image.' });
    }
  };

  const addGraphic = (shapeType: 'rectangle' | 'circle' | 'diamond') => {
    addElement('shape', shapeType === 'circle' ? '' : 'Label', {
      shapeType,
      color: shapeType === 'circle' ? '#10b981' : shapeType === 'diamond' ? '#8b5cf6' : '#3b82f6'
    });
  };

  const postVisionBoardToProfile = async () => {
    if (!vision) return;
    const elements = safeArray<VisionElement>(vision.elements).slice(0, 80);
    const elementSummary = elements.length
      ? `${elements.length} board item${elements.length === 1 ? '' : 's'} shared from this Vision Board.`
      : 'Shared this Vision Board from VisNova.';
    const posted = await addPost({
      type: 'update',
      caption: `Vision Board: ${vision.title}`,
      content: elementSummary,
      visibility: 'public',
      visionId: vision.id,
      tags: ['visionboard', 'vision'],
      metadata: {
        shared_embed: {
          kind: 'vision_board',
          sourceId: vision.id,
          title: vision.title,
          description: vision.description || vision.notes || '',
          progress: vision.progress || 0,
          elements
        }
      }
    });
    if (posted) {
      addToast({ type: 'success', title: 'Posted to profile', description: 'Your Vision Board embed is now on your profile and feed.' });
    }
  };

  const handleMultiImport = (items: any[]) => {
    if (!vision) return;
    const newElements = [...(vision.elements || [])];
    const centerX = 2500;
    const centerY = 2500;
    const spiral = (i: number) => {
      const angle = 0.5 * i;
      const x = (100 + 10 * angle) * Math.cos(angle);
      const y = (100 + 10 * angle) * Math.sin(angle);
      return { x: centerX + x, y: centerY + y };
    };

    items.forEach((item, i) => {
      const pos = spiral(i);
      newElements.push({
        id: Math.random().toString(36).substring(7),
        ...item,
        x: pos.x,
        y: pos.y
      });
    });
    handleUpdateElements(newElements);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!vision) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-overlay backdrop-blur-md z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed bg-card border border-card-border z-[70] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden",
              isFullscreen ? "inset-0 rounded-none" : "inset-0 sm:inset-4 md:inset-8 rounded-none sm:rounded-[2rem]"
            )}
          >
            {/* Intelligent Floating Header */}
            <motion.div 
               animate={{ 
                 height: isCollapsed ? 64 : 100,
                 backgroundColor: isCollapsed ? 'var(--card)' : 'var(--card)',
               }}
               className={cn(
                 "px-6 md:px-10 border-b border-card-border flex items-center justify-between relative z-[80] shrink-0 transition-all duration-500",
                 isCollapsed && "shadow-xl border-transparent"
               )}
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <motion.div 
                    animate={{ scale: isCollapsed ? 0.8 : 1 }}
                    className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-contrast shadow-lg shadow-accent/20"
                  >
                    <Target size={20} />
                  </motion.div>
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-black tracking-tight text-text-main flex items-center gap-2">
                       {vision.title}
                       {saveStatus === 'saving' && <span className="text-[10px] font-medium text-accent animate-pulse">Saving...</span>}
                       {saveStatus === 'saved' && <Cloud size={14} className="text-success opacity-40" />}
                    </h2>
                    {!isCollapsed && (
                      <div className="flex items-center gap-3">
                         <div className="h-1 w-20 bg-bg-base rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${vision.progress}%` }}
                               className="h-full bg-accent" 
                            />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">{vision.progress}% Progress</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "flex bg-bg-base p-1 rounded-2xl border border-card-border/50",
                  isCollapsed ? "ml-2" : "ml-6"
                )}>
                    {(['board', 'milestones'] as Tab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                          isCollapsed ? "px-3" : "px-6",
                          activeTab === tab ? "bg-card text-accent shadow-premium" : "text-text-secondary/40 hover:text-text-main"
                        )}
                      >
                        {tab === 'board' ? 'Vision Board' : isCollapsed ? 'Blueprint' : 'Execution Blueprint'}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Identity Cluster */}
                <div className="hidden md:flex -space-x-3 mr-4">
                   {(vision.collaborators || []).map((collab, i) => (
                     <div key={`collab-${collab.id || i}`} className="relative group/collab">
                        <img 
                          src={collab.avatar} 
                          className={cn(
                            "w-9 h-9 rounded-full border-2 border-card object-cover",
                            collab.online && "ring-2 ring-success ring-offset-2 ring-offset-card"
                          )} 
                          alt={collab.name} 
                        />
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-text-main text-bg-base text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover/collab:opacity-100 transition-opacity whitespace-nowrap z-50">
                          {collab.name}
                        </div>
                     </div>
                   ))}
                   <button
                      onClick={() => setShowCollaborateModal(true)}
                      className="w-9 h-9 rounded-full bg-accent/10 border-2 border-dashed border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-all"
                      title="Invite collaborators"
                   >
                      <Plus size={16} />
                   </button>
                </div>

                <div className="flex items-center gap-2 p-1 bg-bg-base border border-card-border rounded-2xl">
                   <HeaderAction key="header-expand" icon={isCollapsed ? <Minimize2 size={16} /> : <ChevronDown size={16} />} onClick={() => setIsCollapsed(!isCollapsed)} label={isCollapsed ? "Expand" : "Collapse"} />
                   <HeaderAction key="header-focus" icon={isFullscreen ? <Box size={16} /> : <Maximize2 size={16} />} onClick={() => setIsFullscreen(!isFullscreen)} label="Focus" />
                   <div className="w-px h-6 bg-card-border" />
                   <HeaderAction key="header-post-profile" icon={<Share2 size={16} />} onClick={postVisionBoardToProfile} label="Post to profile" />
                   <HeaderAction key="header-publish" icon={<Globe size={16} />} onClick={() => setShowPublishModal(true)} label="Publish" />
                   <HeaderAction key="header-collab" icon={<UserPlus size={16} />} onClick={() => setShowCollaborateModal(true)} label="Collaborate" />
                   <HeaderAction key="header-purge" icon={<Trash2 size={16} />} onClick={() => deleteVision(vision.id)} label="Purge" className="hover:text-danger" />
                </div>
                
                <button
                  onClick={onClose}
                  className="w-11 h-11 bg-card border border-card-border text-text-secondary/40 hover:text-accent hover:border-accent/40 rounded-2xl flex items-center justify-center transition-all shadow-sm"
                >
                  <X size={22} />
                </button>
              </div>
            </motion.div>

            {/* Main Canvas Area */}
            <div className="flex-1 relative min-h-0 overflow-hidden bg-bg-base/30">
               {activeTab === 'board' ? (
                 <CreativeCanvas 
                   vision={vision} 
                   updateVision={updateVision} 
                   onActiveChange={(active) => {
                     if (active && !isCollapsed) setIsCollapsed(true);
                   }}
                 />
               ) : (
                 <ExecutionPlan vision={vision} />
               )}

            </div>
          </motion.div>

          {/* Publish Modal Implementation */}
          <PublishModal 
            isOpen={showPublishModal} 
            onClose={() => setShowPublishModal(false)} 
            vision={vision}
          />
          <CollaborateModal
            isOpen={showCollaborateModal}
            onClose={() => setShowCollaborateModal(false)}
            vision={vision}
          />
        </>
      )}
    </AnimatePresence>
  );
}

/// --- Internal Helper Components ---

function ExecutionPlan({ vision }: { vision: Vision }) {
  const { notes, updateVision, session, addToast, financeGoals, financeTransactions, fetchMoneyOverview } = useStore();
  const navigate = useNavigate();
  const [taskText, setTaskText] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const linkedMoneyGoals = financeGoals.filter(goal => goal.linkedVisionId === vision.id && goal.status !== 'archived');
  const linkedMoneyTransactions = financeTransactions.filter(transaction => transaction.linkedVisionId === vision.id && !transaction.deletedAt);
  const visionMoneyTarget = linkedMoneyGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const visionMoneySaved = linkedMoneyGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const visionMoneyExpenses = linkedMoneyTransactions.filter(transaction => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
  const visionMoneyProgress = Math.min(100, Math.round((visionMoneySaved / Math.max(1, visionMoneyTarget)) * 100));
  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
    } catch {
      return `INR ${Math.round(amount || 0).toLocaleString('en-IN')}`;
    }
  };

  useEffect(() => {
    fetchMoneyOverview().catch(error => console.error('Failed to load Vision Wallet summary:', error));
  }, [fetchMoneyOverview, vision.id]);

  const handleToggleTask = (taskId: string) => {
    const task = vision.tasks.find(t => t.id === taskId);
    const parentTask = task ? null : vision.tasks.find(t => t.subTasks?.some(st => st.id === taskId));
    if (!task && !parentTask) return;
    const nextCompleted = task ? !task.completed : !parentTask!.subTasks!.find(st => st.id === taskId)!.completed;
    const updatedTasks = vision.tasks.map(t => {
      if (t.id === taskId) return { ...t, completed: nextCompleted };
      if (t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => st.id === taskId ? { ...st, completed: !st.completed } : st)
        };
      }
      return t;
    });
    updateVision(vision.id, { tasks: updatedTasks });
    if (parentTask) {
      const updatedParent = updatedTasks.find(t => t.id === parentTask.id);
      supabase
        .from('tasks')
        .update({ sub_tasks: updatedParent?.subTasks || [], updated_at: new Date().toISOString() })
        .eq('id', parentTask.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to update blueprint subtask:', error);
            addToast({ type: 'error', title: 'Subtask failed', description: 'Could not save this subtask change.' });
          }
        });
      return;
    }

    supabase
      .from('tasks')
      .update({ completed: nextCompleted, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update blueprint task:', error);
          addToast({ type: 'error', title: 'Task failed', description: 'Could not save this task change.' });
          updateVision(vision.id, { tasks: vision.tasks });
        }
      });
  };

  const handleAddSubTask = (parentId: string, text: string) => {
    const updatedTasks = vision.tasks.map(t => {
      if (t.id === parentId) {
        return {
          ...t,
          subTasks: [...(t.subTasks || []), { id: Math.random().toString(36).substring(7), text, completed: false }]
        };
      }
      return t;
    });
    updateVision(vision.id, { tasks: updatedTasks });
    const parent = updatedTasks.find(t => t.id === parentId);
    if (parent) {
      supabase
        .from('tasks')
        .update({ sub_tasks: parent.subTasks || [], updated_at: new Date().toISOString() })
        .eq('id', parentId)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save subtask:', error);
            addToast({ type: 'error', title: 'Subtask failed', description: 'Could not save this subtask.' });
          }
        });
    }
  };

  const handleUpdatePriority = (taskId: string, priority: 'low' | 'medium' | 'high') => {
    const updatedTasks = vision.tasks.map(t => t.id === taskId ? { ...t, priority } : t);
    updateVision(vision.id, { tasks: updatedTasks });
    supabase
      .from('tasks')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save task priority:', error);
          addToast({ type: 'error', title: 'Priority failed', description: 'Could not save this priority.' });
        }
      });
  };

  const handleUpdateTaskText = (taskId: string, text: string) => {
    const updatedTasks = vision.tasks.map(t => t.id === taskId ? { ...t, text } : t);
    updateVision(vision.id, { tasks: updatedTasks });
    if (taskId.startsWith('temp-')) return;
    supabase
      .from('tasks')
      .update({ text, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to rename blueprint task:', error);
          addToast({ type: 'error', title: 'Rename failed', description: 'Could not save this roadmap item.' });
          updateVision(vision.id, { tasks: vision.tasks });
        }
      });
  };

  const handleUpdateTaskDescription = (taskId: string, description: string) => {
    const updatedTasks = vision.tasks.map(t => t.id === taskId ? { ...t, description } : t);
    updateVision(vision.id, { tasks: updatedTasks });
    if (taskId.startsWith('temp-')) return;
    supabase
      .from('tasks')
      .update({ description, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save blueprint task description:', error);
          addToast({ type: 'error', title: 'Description failed', description: 'Could not save this roadmap description.' });
          updateVision(vision.id, { tasks: vision.tasks });
        }
      });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = vision.tasks.filter(t => t.id !== taskId);
    updateVision(vision.id, { tasks: updatedTasks });
    if (taskId.startsWith('temp-')) return;
    supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete blueprint task:', error);
          addToast({ type: 'error', title: 'Delete failed', description: 'Could not delete this roadmap item.' });
          updateVision(vision.id, { tasks: vision.tasks });
        }
      });
  };

  const persistSubTasks = (parentId: string, nextTasks: Task[], failureTitle: string) => {
    const parent = nextTasks.find(t => t.id === parentId);
    if (!parent || parentId.startsWith('temp-')) return;
    supabase
      .from('tasks')
      .update({ sub_tasks: parent.subTasks || [], updated_at: new Date().toISOString() })
      .eq('id', parentId)
      .then(({ error }) => {
        if (error) {
          console.error(failureTitle, error);
          addToast({ type: 'error', title: 'Checklist failed', description: 'Could not save this checklist change.' });
          updateVision(vision.id, { tasks: vision.tasks });
        }
      });
  };

  const handleUpdateSubTaskText = (parentId: string, subTaskId: string, text: string) => {
    const updatedTasks = vision.tasks.map(t => t.id === parentId ? {
      ...t,
      subTasks: (t.subTasks || []).map(st => st.id === subTaskId ? { ...st, text } : st)
    } : t);
    updateVision(vision.id, { tasks: updatedTasks });
    persistSubTasks(parentId, updatedTasks, 'Failed to rename blueprint checklist item:');
  };

  const handleDeleteSubTask = (parentId: string, subTaskId: string) => {
    const updatedTasks = vision.tasks.map(t => t.id === parentId ? {
      ...t,
      subTasks: (t.subTasks || []).filter(st => st.id !== subTaskId)
    } : t);
    updateVision(vision.id, { tasks: updatedTasks });
    persistSubTasks(parentId, updatedTasks, 'Failed to delete blueprint checklist item:');
  };

  const handleAddTask = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = taskText.trim();
    const userId = session?.user?.id;
    if (!text) return;
    if (!userId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to add blueprint tasks.' });
      return;
    }

    setIsAddingTask(true);
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      text,
      description: taskDescription.trim(),
      completed: false,
      priority: 'low',
      subTasks: []
    };
    updateVision(vision.id, { tasks: [...vision.tasks, tempTask] });
    setTaskText('');
    setTaskDescription('');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        vision_id: vision.id,
        text,
        description: tempTask.description || '',
        completed: false,
        priority: 'low',
        sub_tasks: [],
        sort_order: vision.tasks.length
      })
      .select('*')
      .single();

    setIsAddingTask(false);
    if (error) {
      console.error('Failed to add blueprint task:', error);
      addToast({ type: 'error', title: 'Task failed', description: error.message || 'Could not add this task.' });
      updateVision(vision.id, { tasks: vision.tasks });
      return;
    }

    const savedTask: Task = {
      id: data.id,
      text: data.text,
      description: data.description || '',
      completed: data.completed,
      priority: data.priority || 'low',
      subTasks: data.sub_tasks || []
    };
    updateVision(vision.id, { tasks: [...vision.tasks, savedTask] });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = vision.tasks.findIndex(t => t.id === active.id);
      const newIndex = vision.tasks.findIndex(t => t.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const newTasks = arrayMove(vision.tasks, oldIndex, newIndex);
      updateVision(vision.id, { tasks: newTasks });
      Promise.all(
        newTasks
          .filter(task => !task.id.startsWith('temp-'))
          .map((task, index) => supabase
            .from('tasks')
            .update({ sort_order: index, updated_at: new Date().toISOString() })
            .eq('id', task.id))
      ).then(results => {
        const failed = results.find(result => result.error);
        if (failed?.error) {
          console.error('Failed to save blueprint task order:', failed.error);
          addToast({ type: 'error', title: 'Order failed', description: 'Could not save this task order.' });
        }
      });
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-bg-base/40 custom-scrollbar">
      <div className="mx-auto flex min-h-full max-w-[1180px] flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <div className="rounded-[2rem] border border-card-border bg-card/95 p-4 shadow-xl shadow-accent/5 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">Execution Blueprint</p>
              <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-text-main sm:text-3xl">
                The roadmap to {vision.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-text-secondary/75">
                {vision.description || 'Turn this Vision into a clear sequence of proof-backed steps.'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
              <div className="rounded-2xl border border-card-border bg-app-container p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/55">Steps</p>
                <p className="mt-1 text-xl font-black text-text-main">{vision.tasks.length}</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-app-container p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/55">Done</p>
                <p className="mt-1 text-xl font-black text-success">{vision.tasks.filter(task => task.completed).length}</p>
              </div>
              <div className="rounded-2xl border border-card-border bg-app-container p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/55">Progress</p>
                <p className="mt-1 text-xl font-black text-accent">{vision.progress || 0}%</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${vision.progress || 0}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex flex-col rounded-[2rem] border border-card-border bg-card/95 shadow-xl shadow-accent/5">
            <div className="flex flex-col gap-3 border-b border-card-border p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary/50">Roadmap</p>
                  <h3 className="text-lg font-black text-text-main">Action sequence</h3>
                </div>
                <button
                  onClick={() => {
                    const input = document.getElementById('blueprint-task-title');
                    input?.focus();
                  }}
                  className="flex h-10 items-center gap-2 rounded-2xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/20"
                >
                  <Plus size={15} /> Add task
                </button>
              </div>
              <form onSubmit={handleAddTask} className="grid gap-2 rounded-2xl border border-card-border bg-app-container p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto]">
                <input
                  id="blueprint-task-title"
                  value={taskText}
                  onChange={(event) => setTaskText(event.target.value)}
                  placeholder="Add a task..."
                  className="h-11 min-w-0 rounded-xl border border-card-border bg-card px-3 text-sm font-bold text-text-main outline-none placeholder:text-text-secondary/35 focus:border-accent"
                />
                <input
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  placeholder="Description or proof needed..."
                  className="h-11 min-w-0 rounded-xl border border-card-border bg-card px-3 text-sm font-semibold text-text-secondary outline-none placeholder:text-text-secondary/35 focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={isAddingTask || !taskText.trim()}
                  className="h-11 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            </div>

            <div className="p-4 sm:p-5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={vision.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-6 pb-8">
                    {vision.tasks.length === 0 && (
                      <div className="rounded-[2rem] border border-dashed border-card-border p-10 text-center">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                          <Target size={20} />
                        </div>
                        <p className="mt-4 text-sm font-black uppercase tracking-widest text-text-main">No roadmap steps yet</p>
                        <p className="mt-2 text-sm font-semibold text-text-secondary">Add the first task and VisNova will turn it into a clear execution path.</p>
                      </div>
                    )}
                    {vision.tasks.map((t, idx) => (
                      <SortableTaskItem
                        key={t.id || idx}
                        task={t}
                        index={idx}
                        onToggle={handleToggleTask}
                        onAddSubTask={handleAddSubTask}
                        isLast={idx === vision.tasks.length - 1}
                        onUpdatePriority={handleUpdatePriority}
                        onUpdateText={handleUpdateTaskText}
                        onUpdateDescription={handleUpdateTaskDescription}
                        onDeleteTask={handleDeleteTask}
                        onUpdateSubTaskText={handleUpdateSubTaskText}
                        onDeleteSubTask={handleDeleteSubTask}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </section>

          <aside className="grid gap-4 self-start xl:block xl:space-y-4">
            <div className="rounded-[2rem] border border-card-border bg-card/95 p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Wallet size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-text-main">Resource pulse</h3>
                  <p className="mt-1 text-xs font-semibold text-text-secondary">
                    {linkedMoneyGoals.length > 0 ? `${formatMoney(visionMoneySaved)} saved of ${formatMoney(visionMoneyTarget)}` : 'Connect funds to this Vision.'}
                  </p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${visionMoneyProgress}%` }} />
              </div>
              <button
                onClick={() => navigate('/wallet')}
                className="mt-4 h-10 w-full rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast"
              >
                Open Wallet
              </button>
            </div>

            <div className="rounded-[2rem] border border-card-border bg-card/95 p-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-text-secondary/50">Linked Notes</h3>
              <div className="mt-4 space-y-3">
                {notes.filter(n => n.linkedVisionId === vision.id).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-card-border p-5 text-xs font-bold text-text-secondary/50">No linked notes yet.</div>
                ) : notes.filter(n => n.linkedVisionId === vision.id).slice(0, 5).map(n => (
                  <div key={n.id} className="rounded-2xl border border-card-border bg-app-container p-4">
                    <h4 className="line-clamp-1 text-sm font-black text-text-main">{n.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-text-secondary">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl text-text-secondary/60 hover:text-accent hover:bg-accent-soft transition-all group"
    >
      {icon}
      <span className="text-[8px] font-bold uppercase tracking-widest mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
    </button>
  );
}

function HeaderAction({ icon, onClick, label, className }: { icon: React.ReactNode, onClick: () => void, label: string, className?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary/40 hover:text-accent hover:bg-accent/5 transition-all group relative",
        className
      )}
    >
      {icon}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-text-main text-bg-base text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none shadow-xl border border-card-border">
        {label}
      </div>
    </button>
  );
}

function GridItem({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 rounded-3xl bg-bg-base border border-card-border hover:border-accent hover:bg-accent/5 transition-all group"
    >
      <div className="w-10 h-10 rounded-2xl bg-card border border-card-border flex items-center justify-center text-text-secondary group-hover:text-accent group-hover:border-accent/20 transition-all mb-2 shadow-sm">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60 group-hover:text-text-main transition-colors">{label}</span>
    </button>
  );
}

function QuickStartAction({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-6 py-2.5 rounded-2xl bg-card border border-card-border text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all text-xs font-bold shadow-premium"
    >
      {label}
    </button>
  );
}

