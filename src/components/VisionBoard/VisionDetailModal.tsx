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

interface VisionDetailModalProps {
  vision: Vision | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'board' | 'milestones';

// Add save status type
type SaveStatus = 'idle' | 'saving' | 'saved';

function SortableTaskItem({ task, onToggle, onAddSubTask, isLast, onUpdatePriority, onUpdateText, onUpdateDescription, onDeleteTask, onUpdateSubTaskText, onDeleteSubTask }: {
  task: Task,
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

  const priorityColors = {
    low: "text-text-secondary/40 fill-none",
    medium: "text-warning fill-warning/20",
    high: "text-danger fill-danger/20"
  };

  const priorityLabels = {
    low: "Standard",
    medium: "Priority",
    high: "Critical"
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-5 p-7 rounded-[2rem] border transition-all cursor-pointer group relative",
          task.completed
              ? "bg-bg-base/30 border-transparent text-text-secondary/30"
              : "bg-card border-card-border hover:shadow-2xl hover:shadow-accent/5 hover:translate-y-[-2px]"
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className="touch-none flex items-center justify-center text-text-secondary/10 group-hover:text-text-secondary/40 transition-colors cursor-grab active:cursor-grabbing p-1.5 -ml-2"
        >
          <GripVertical size={18} />
        </div>

        {/* Priority Indicator Line */}
        <div className={cn(
          "absolute left-10 top-4 bottom-4 w-1 rounded-full",
          task.priority === 'high' ? "bg-danger shadow-[0_0_10px_rgba(239,68,68,0.4)]" :
          task.priority === 'medium' ? "bg-warning" :
          "bg-card-border/0"
        )} />

        <div
          onClick={() => onToggle(task.id)}
          className={cn(
              "w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
              task.completed ? "bg-success border-success" : "border-card-border group-hover:border-accent"
          )}
        >
            {task.completed && <CheckCircle2 size={16} className="text-accent-contrast" />}
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
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
            className={cn("w-full bg-transparent outline-none text-lg font-bold tracking-tight transition-all", task.completed && "line-through opacity-40")}
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
            placeholder="Describe this step, success criteria, or proof needed..."
            rows={2}
            className={cn("mt-2 w-full resize-none bg-transparent outline-none text-xs font-semibold leading-relaxed text-text-secondary/70 placeholder:text-text-secondary/30", task.completed && "opacity-40")}
          />
          <div className="flex items-center gap-4 mt-1.5">
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 const next: Record<string, 'low' | 'medium' | 'high'> = { low: 'medium', medium: 'high', high: 'low' };
                 onUpdatePriority(task.id, next[task.priority || 'low'] as any);
               }}
               className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105", priorityColors[task.priority || 'low'])}
            >
               <Target size={12} className={cn("transition-transform", (task.priority === 'high' || task.priority === 'medium') && "animate-pulse")} />
               {priorityLabels[task.priority || 'low']}
            </button>
            {task.subTasks && task.subTasks.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex items-center gap-1.5 text-text-secondary/30 hover:text-accent transition-colors text-[9px] font-black uppercase tracking-widest"
              >
                {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length} Layers
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleAddSubTask}
          className="w-12 h-12 rounded-2xl bg-accent/5 text-accent opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-accent hover:text-accent-contrast hover:rotate-90"
          aria-label="Add checklist item"
        >
          <Plus size={20} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDeleteTask(task.id);
          }}
          className="w-12 h-12 rounded-2xl bg-danger/5 text-danger opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-danger hover:text-white"
          aria-label="Delete roadmap item"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Sub-tasks */}
      <AnimatePresence>
        {isExpanded && task.subTasks && task.subTasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-12 space-y-2 overflow-hidden"
          >
            {task.subTasks.map((subTask, sIdx) => (
              <div
                key={subTask.id || sIdx}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border border-card-border/50 bg-card/30 hover:bg-card/50 transition-all group",
                  subTask.completed && "opacity-50"
                )}
              >
                <button
                  onClick={() => onToggle(subTask.id)}
                  className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  subTask.completed ? "bg-success border-success" : "border-card-border group-hover:border-accent"
                )}>
                  {subTask.completed && <CheckCircle2 size={10} className="text-accent-contrast" />}
                </button>
                <input
                  value={subTask.text}
                  onChange={(event) => onUpdateSubTaskText(task.id, subTask.id, event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  className={cn("min-w-0 flex-1 bg-transparent outline-none text-xs font-medium tracking-tight", subTask.completed && "line-through")}
                />
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteSubTask(task.id, subTask.id);
                  }}
                  className="w-8 h-8 rounded-lg text-text-secondary/40 hover:text-danger hover:bg-danger/10 flex items-center justify-center"
                  aria-label="Delete checklist item"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VisionDetailModal({ vision, isOpen, onClose }: VisionDetailModalProps) {
  const { updateVision, deleteVision, notes, addNote, shareVision, session, addToast } = useStore();
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
                        {tab === 'board' ? 'Canvas' : isCollapsed ? 'Blueprint' : 'Execution Blueprint'}
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
            <div className="flex-1 relative overflow-hidden bg-bg-base/30">
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

               {/* Collapsed Overlay Info */}
               {isCollapsed && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="absolute top-20 left-10 z-40 bg-card/60 backdrop-blur-md border border-card-border p-4 rounded-3xl animate-in fade-in slide-in-from-top-4"
                 >
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/60">Creative Workspace</span>
                       <h3 className="text-sm font-bold text-text-main">{vision.title}</h3>
                    </div>
                 </motion.div>
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
    <div className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10 custom-scrollbar">
       <div className="mx-auto max-w-[1500px] space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
             <aside className="space-y-5">
                <div className="rounded-[2rem] border border-card-border bg-card p-5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">Execution Blueprint</span>
                  <h2 className="mt-2 text-2xl font-black text-text-main tracking-tight">{vision.title}</h2>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-text-secondary/75">{vision.description || 'Build this vision one clear step at a time.'}</p>
                </div>

                <form onSubmit={handleAddTask} className="rounded-[2rem] border border-card-border bg-card p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">Add step</p>
                    <h3 className="text-base font-black text-text-main">Roadmap builder</h3>
                  </div>
                  <input
                    value={taskText}
                    onChange={(event) => setTaskText(event.target.value)}
                    placeholder="Step title..."
                    className="w-full h-12 rounded-2xl bg-app-container border border-card-border px-4 text-sm font-bold text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:border-accent"
                  />
                  <textarea
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    placeholder="Describe the step, success criteria, or proof needed..."
                    rows={4}
                    className="w-full resize-none rounded-2xl bg-app-container border border-card-border px-4 py-3 text-sm font-semibold text-text-secondary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={isAddingTask || !taskText.trim()}
                    className="h-12 w-full justify-center rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={16} /> Add roadmap step
                  </button>
                </form>

                <div className="rounded-[2rem] border border-card-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/45">Progress</p>
                      <p className="text-sm font-black text-text-main">{vision.tasks.filter(task => task.completed).length}/{vision.tasks.length} complete</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                      <Target size={18} />
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${vision.progress || 0}%` }} />
                  </div>
                </div>
             </aside>

             <section className="rounded-[2rem] border border-card-border bg-card p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">Roadmap</p>
                    <h3 className="text-2xl font-black text-text-main tracking-tight">Editable execution roadmap</h3>
                    <p className="mt-1 text-xs font-semibold text-text-secondary/65">Click a card to move it from Now to Next to Later. Edit full details in Action Steps below.</p>
                  </div>
                  <p className="rounded-full border border-card-border bg-app-container px-4 py-2 text-xs font-bold text-text-secondary">{vision.tasks.length} steps</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {([
                    { key: 'high', label: 'Now', helper: 'Critical next moves', step: '01' },
                    { key: 'medium', label: 'Next', helper: 'Priority work', step: '02' },
                    { key: 'low', label: 'Later', helper: 'Standard tasks', step: '03' }
                  ] as const).map(column => {
                    const items = vision.tasks.filter(task => (task.priority || 'low') === column.key);
                    return (
                      <div key={column.key} className="rounded-2xl bg-app-container border border-card-border p-4 min-h-[360px]">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-[10px] font-black text-accent">{column.step}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-text-main">{column.label}</p>
                            <p className="text-[10px] font-bold text-text-secondary">{column.helper}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {items.length > 0 ? items.map(task => (
                            <button
                              key={task.id}
                              onClick={() => handleUpdatePriority(task.id, column.key === 'high' ? 'medium' : column.key === 'medium' ? 'low' : 'high')}
                              className={cn('w-full text-left rounded-xl border border-card-border bg-card px-3 py-3 text-xs font-bold text-text-secondary hover:border-accent/40 hover:-translate-y-0.5 transition-all', task.completed && 'opacity-50')}
                              title="Click to move to the next roadmap stage"
                            >
                              <span className={cn("block text-text-main", task.completed && "line-through")}>{task.text}</span>
                              <span className="mt-1 block line-clamp-3 text-[10px] font-semibold leading-relaxed text-text-secondary/65">
                                {task.description || 'No description yet.'}
                              </span>
                            </button>
                          )) : (
                            <p className="rounded-xl border border-dashed border-card-border p-4 text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Add a step or move one here</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
             </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
             <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Action Steps</h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={vision.tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {vision.tasks.length === 0 && (
                        <div className="p-8 rounded-[2rem] border border-dashed border-card-border text-center text-xs font-black uppercase tracking-widest text-text-secondary/40">
                          No roadmap steps yet. Add the first step from the builder.
                        </div>
                      )}
                      {vision.tasks.map((t, idx) => (
                        <SortableTaskItem
                          key={t.id || idx}
                          task={t}
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
             </section>

             <aside className="space-y-5">
                <div className="rounded-[2rem] border border-card-border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Wallet size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-text-main">Wallet</h3>
                      <p className="text-xs font-semibold text-text-secondary mt-1">
                        {linkedMoneyGoals.length > 0
                          ? `${formatMoney(visionMoneySaved)} saved of ${formatMoney(visionMoneyTarget)} target`
                          : 'Track funds for this Vision.'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${visionMoneyProgress}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-app-container border border-card-border p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Goals</p>
                      <p className="text-sm font-black text-text-main mt-1">{linkedMoneyGoals.length}</p>
                    </div>
                    <div className="rounded-2xl bg-app-container border border-card-border p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Saved</p>
                      <p className="text-sm font-black text-success mt-1">{formatMoney(visionMoneySaved)}</p>
                    </div>
                    <div className="rounded-2xl bg-app-container border border-card-border p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Spend</p>
                      <p className="text-sm font-black text-danger mt-1">{formatMoney(visionMoneyExpenses)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/wallet')}
                    className="mt-4 h-10 w-full rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest"
                  >
                    Open Wallet
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Knowledge Base</h3>
                  {notes.filter(n => n.linkedVisionId === vision.id).length === 0 ? (
                    <div className="rounded-[2rem] border border-dashed border-card-border p-6 text-xs font-bold text-text-secondary/45">No linked notes yet.</div>
                  ) : notes.filter(n => n.linkedVisionId === vision.id).map(n => (
                    <div key={n.id} className="p-5 bg-card border border-card-border rounded-[2rem] hover:border-accent/30 transition-all cursor-pointer">
                      <h4 className="font-bold text-text-main mb-2 tracking-tight">{n.title}</h4>
                      <p className="text-xs text-text-secondary line-clamp-2">{n.content}</p>
                    </div>
                  ))}
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

