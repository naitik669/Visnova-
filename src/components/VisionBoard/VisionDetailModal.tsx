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
  UserPlus
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

interface VisionDetailModalProps {
  vision: Vision | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'board' | 'milestones';

// Add save status type
type SaveStatus = 'idle' | 'saving' | 'saved';

function SortableTaskItem({ task, onToggle, onAddSubTask, isLast, onUpdatePriority }: {
  task: Task,
  onToggle: (id: string) => void,
  onAddSubTask: (parentId: string, text: string) => void,
  isLast: boolean,
  onUpdatePriority: (id: string, priority: 'low' | 'medium' | 'high') => void
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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
        
        <div className="flex-1 flex flex-col min-w-0" onClick={() => onToggle(task.id)}>
          <span
            className={cn("text-lg font-bold tracking-tight transition-all", task.completed && "line-through opacity-40")}
          >
            {task.text}
          </span>
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
        >
          <Plus size={20} />
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
                onClick={() => onToggle(subTask.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border border-card-border/50 bg-card/30 hover:bg-card/50 transition-all cursor-pointer group",
                  subTask.completed && "opacity-50"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  subTask.completed ? "bg-success border-success" : "border-card-border group-hover:border-accent"
                )}>
                  {subTask.completed && <CheckCircle2 size={10} className="text-accent-contrast" />}
                </div>
                <span className={cn("text-xs font-medium tracking-tight", subTask.completed && "line-through")}>
                  {subTask.text}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VisionDetailModal({ vision, isOpen, onClose }: VisionDetailModalProps) {
  const { updateVision, deleteVision, notes, addNote, shareVision } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    const newElement: VisionElement = {
      id: Math.random().toString(36).substring(7),
      type,
      content,
      x: 2500 + (Math.random() * 200 - 100), // Center of the 5000x5000 canvas
      y: 2500 + (Math.random() * 200 - 100),
      scale: 1,
      rotation: 0,
      metadata
    };
    handleUpdateElements([...(vision.elements || []), newElement]);
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
              inset: isFullscreen ? '0px' : '32px',
              borderRadius: isFullscreen ? '0px' : '32px',
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed bg-card border border-card-border z-[70] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden",
              !isFullscreen && "inset-4 md:inset-8"
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

                {!isCollapsed && (
                  <div className="flex bg-bg-base p-1 rounded-2xl border border-card-border/50 ml-6">
                    {(['board', 'milestones'] as Tab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                          activeTab === tab ? "bg-card text-accent shadow-premium" : "text-text-secondary/40 hover:text-text-main"
                        )}
                      >
                        {tab === 'board' ? 'Vision Canvas' : 'Execution Blueprint'}
                      </button>
                    ))}
                  </div>
                )}
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
                   <button className="w-9 h-9 rounded-full bg-accent/10 border-2 border-dashed border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-all">
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

               {/* Quick Creation Menu (Floating Target) */}
               {activeTab === 'board' && (
                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
                    <AnimatePresence>
                      {showAddMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.9 }}
                          className="bg-card/90 backdrop-blur-2xl border border-card-border p-4 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] grid grid-cols-4 gap-4"
                        >
                           <GridItem key="grid-image" icon={<ImageIcon size={20} />} label="Image" onClick={() => addElement('image')} />
                           <GridItem key="grid-title" icon={<Type size={20} />} label="Title" onClick={() => addElement('heading', 'New Vision')} />
                           <GridItem key="grid-sticky" icon={<FileText size={20} />} label="Sticky" onClick={() => addElement('sticky', 'Brainstorm...')} />
                           <GridItem key="grid-resource" icon={<LinkIcon size={20} />} label="Resource" onClick={() => addElement('link')} />
                           <GridItem key="grid-checklist" icon={<CheckSquare size={20} />} label="Checklist" onClick={() => addElement('note')} />
                           <GridItem key="grid-quote" icon={<Quote size={20} />} label="Quote" onClick={() => addElement('quote')} />
                           <GridItem key="grid-graphics" icon={<Sparkles size={20} />} label="Graphics" onClick={() => {}} />
                           <GridItem key="grid-import" icon={<Users size={20} />} label="Import" onClick={() => {}} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-premium ring-4 ring-bg-base",
                        showAddMenu ? "bg-text-main text-bg-base rotate-45" : "bg-accent text-accent-contrast hover:scale-110 active:scale-90"
                      )}
                    >
                       <Plus size={32} />
                    </button>
                 </div>
               )}
            </div>

            {/* Empty State Overlay */}
            {!vision.elements?.length && activeTab === 'board' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-8 z-10 px-10">
                 <div className="text-center space-y-4 max-w-lg">
                    <h1 className="text-6xl font-black tracking-tighter text-text-main opacity-20">Start building your vision.</h1>
                    <p className="text-lg font-medium text-text-secondary opacity-40 ">Drop an image, write a goal, or map your next move.</p>
                 </div>
                 <div className="flex flex-wrap justify-center gap-3 pointer-events-auto">
                    <QuickStartAction label="Add Image" onClick={() => addElement('image')} />
                    <QuickStartAction label="Write Goal" onClick={() => addElement('heading', 'Main Goal')} />
                    <QuickStartAction label="Strategic Note" onClick={() => addElement('note')} />
                    <QuickStartAction label="Inspire" onClick={() => addElement('quote')} />
                 </div>
              </div>
            )}
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
  const { notes, updateVision } = useStore();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = vision.tasks.map(t => {
      if (t.id === taskId) return { ...t, completed: !t.completed };
      if (t.subTasks) {
        return {
          ...t,
          subTasks: t.subTasks.map(st => st.id === taskId ? { ...st, completed: !st.completed } : st)
        };
      }
      return t;
    });
    updateVision(vision.id, { tasks: updatedTasks });
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
  };

  const handleUpdatePriority = (taskId: string, priority: 'low' | 'medium' | 'high') => {
    const updatedTasks = vision.tasks.map(t => t.id === taskId ? { ...t, priority } : t);
    updateVision(vision.id, { tasks: updatedTasks });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = vision.tasks.findIndex(t => t.id === active.id);
      const newIndex = vision.tasks.findIndex(t => t.id === over.id);
      const newTasks = arrayMove(vision.tasks, oldIndex, newIndex);
      updateVision(vision.id, { tasks: newTasks });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 lg:p-20 space-y-20 custom-scrollbar">
       <div className="max-w-4xl mx-auto space-y-16">
          <div className="space-y-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-accent">Main Goal</span>
             <h2 className="text-3xl font-black text-text-main tracking-tighter">{vision.title}</h2>
             <p className="text-xl text-text-secondary font-medium  border-l-4 border-accent/20 pl-8">{vision.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Knowledge Base</h3>
                <div className="grid grid-cols-1 gap-4">
                   {notes.filter(n => n.linkedVisionId === vision.id).map(n => (
                     <div key={n.id} className="p-6 bg-card border border-card-border rounded-[2rem] hover:border-accent/30 transition-all cursor-pointer">
                        <h4 className="font-bold text-text-main mb-2 tracking-tight">{n.title}</h4>
                        <p className="text-xs text-text-secondary line-clamp-2">{n.content}</p>
                     </div>
                   ))}
                </div>
             </div>
             <div className="space-y-8">
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
                      {vision.tasks.map((t, idx) => (
                        <SortableTaskItem
                          key={t.id || idx}
                          task={t}
                          onToggle={handleToggleTask}
                          onAddSubTask={handleAddSubTask}
                          isLast={idx === vision.tasks.length - 1}
                          onUpdatePriority={handleUpdatePriority}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
             </div>
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


