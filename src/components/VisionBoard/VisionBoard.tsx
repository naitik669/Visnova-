/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Filter,
  Target,
  Sparkles,
  Trello,
  Compass,
  Layers,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import VisionCard from './VisionCard';
import KanbanBoard from './KanbanBoard';
import VisionDetailModal from './VisionDetailModal';
import VisionSetupOverlay from './VisionSetupOverlay';
import VisionHints from './VisionHints';
import DailyJournal from './DailyJournal';
import { Vision } from '../../types';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { safeArray, safeFormat } from '../../lib/safeData';
import { SharedWithMeCard } from '../VisionTeam/SharedWithMeCard';
import { MobileEmptyState } from '../mobile/MobileLayout';

export default function VisionBoard() {
  const { visions, sharedVisions, addVision, updateVision, addActivity, addToast, session, fetchVisions, isVisionsLoading } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [setupVision, setSetupVision] = useState<Vision | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeVisionBoards = useMemo(() => {
    const boardsWithContent = visions.filter(vision => safeArray(vision.elements).length > 0);
    const source = boardsWithContent.length ? boardsWithContent : visions;
    return [...source]
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [visions]);
  const repositoryVisions = useMemo(() => visions, [visions]);
  const showVisionSkeleton = isVisionsLoading && visions.length === 0;

  useEffect(() => {
    if (session?.user?.id) {
      fetchVisions().catch(error => console.error('Failed to load Vision Board repository:', error));
    }
  }, [fetchVisions, session?.user?.id]);

  useEffect(() => {
    if (!selectedVision) return;
    const latest = visions.find(vision => vision.id === selectedVision.id);
    if (latest && latest !== selectedVision) {
      setSelectedVision(latest);
    }
  }, [selectedVision, visions]);

  useEffect(() => {
    const openVisionId = searchParams.get('open');
    if (!openVisionId || isVisionsLoading) return;
    const target = visions.find(vision => vision.id === openVisionId);
    if (!target) return;
    setSelectedVision(target);
    setIsModalOpen(true);
  }, [isVisionsLoading, searchParams, visions]);

  const refreshRepository = async () => {
    if (!session?.user?.id) {
      addToast({
        type: 'error',
        title: 'Login required',
        description: 'Sign in again to load your Vision Boards.'
      });
      return;
    }

    setIsRefreshing(true);
    try {
      await fetchVisions();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCardClick = (vision: Vision) => {
    setSelectedVision(vision);
    setIsModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.set('open', vision.id);
    setSearchParams(next, { replace: false });
  };

  const handleCloseVision = () => {
    setIsModalOpen(false);
    setSelectedVision(null);
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  };

  const handleAddNew = useCallback(async () => {
    const newVision = await addVision({
      title: 'New Vision',
      description: '',
      tags: [],
      status: 'idea',
    });
    setSetupVision(newVision);
    addActivity({
      type: 'created',
      userId: 'me',
      description: `Primary strategic sequence started for New Vision.`,
    });
  }, [addActivity, addVision]);

  useEffect(() => {
    const createFromMobileShortcut = () => {
      void handleAddNew();
    };
    window.addEventListener('visnova-create-vision', createFromMobileShortcut);
    return () => window.removeEventListener('visnova-create-vision', createFromMobileShortcut);
  }, [handleAddNew]);

  const handleSetupComplete = async (updates: Partial<Vision>) => {
    if (setupVision) {
      let savedTasks = updates.tasks;
      const userId = session?.user?.id;

      if (userId && updates.tasks?.length) {
        const { data, error } = await supabase
          .from('tasks')
          .insert(updates.tasks.map((task, index) => ({
            user_id: userId,
            vision_id: setupVision.id,
            text: task.text,
            completed: task.completed ?? false,
            priority: task.priority || 'low',
            sub_tasks: task.subTasks || [],
            sort_order: index
          })))
          .select('*');

        if (error) {
          console.error('Failed to save setup tasks:', error);
          addToast({
            type: 'error',
            title: 'Tasks not saved',
            description: error.message || 'Your vision was saved, but template tasks could not be created.'
          });
        } else {
          savedTasks = (data || []).map((task: any) => ({
            id: task.id,
            text: task.text,
            completed: task.completed,
            priority: task.priority || 'low',
            subTasks: task.sub_tasks || []
          }));
        }
      }

      const normalizedUpdates = { ...updates, tasks: savedTasks || [] };
      updateVision(setupVision.id, normalizedUpdates);
      const updatedVision = { ...setupVision, ...normalizedUpdates };
      setSetupVision(null);
      setSelectedVision(updatedVision);
      setIsModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.set('open', updatedVision.id);
      setSearchParams(next, { replace: false });
      addToast({
        type: 'success',
        title: 'Vision Initialized',
        description: 'Strategic objective has been successfully defined.'
      });
    }
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-10 sm:space-y-16 lg:space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-32 sm:pb-48 px-0 sm:px-4 pt-3 sm:pt-8 overflow-x-hidden">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-16 px-1">
        <div className="space-y-4 max-w-4xl">
           <div className="flex items-center gap-4 text-accent/60">
              <div className="w-10 h-px bg-accent/30" />
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">The Vision Board</span>
           </div>
           
           <div className="space-y-1">
             <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight sm:tracking-tighter text-text-main leading-tight sm:leading-[0.85] uppercase sm:-ml-1 break-words">
               Future<br/>
               <span className="text-accent underline decoration-accent/10 underline-offset-8">Vision</span>
             </h1>
           </div>

           <p className="text-text-secondary/70 font-medium max-w-xl leading-relaxed text-sm sm:text-base border-l-2 border-accent/20 pl-4 sm:pl-6">
             Build your goals and aspirations. Align inspirations, define milestones, and manifest the specific future you are building.
           </p>
        </div>
        
        <div className="flex items-center gap-2 bg-app-container border border-card-border p-2 rounded-[2rem] shadow-2xl shadow-accent/5 backdrop-blur-xl lg:hidden">
           {(['grid', 'list'] as const).map(mode => (
             <button
               key={mode}
               onClick={() => setViewMode(mode)}
               className={cn(
                 "px-5 py-3 rounded-[1.35rem] text-[10px] font-black uppercase tracking-widest transition-all",
                 viewMode === mode ? "bg-text-main text-bg-base shadow-lg" : "text-text-secondary hover:text-text-main"
               )}
             >
               {mode === 'grid' ? 'Board' : 'List'}
             </button>
           ))}
           <button
             id="add-vision-btn-mobile"
             onClick={handleAddNew}
             className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-accent text-accent-contrast shadow-lg shadow-accent/20 active:scale-95 transition-all"
             aria-label="Create Vision"
           >
             <Plus size={22} />
           </button>
        </div>

        <div className="hidden items-center gap-2 sm:gap-4 bg-app-container border border-card-border p-2 rounded-[2rem] sm:rounded-[3rem] shadow-2xl shadow-accent/5 backdrop-blur-xl overflow-x-auto custom-scrollbar max-w-full lg:flex">
           {(['grid', 'kanban'] as const).map(mode => (
             <button
               key={mode}
               onClick={() => setViewMode(mode)}
               className={cn(
                 "px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                 viewMode === mode ? "bg-text-main text-bg-base shadow-lg" : "text-text-secondary hover:text-text-main"
               )}
             >
               {mode}
             </button>
           ))}
           <div className="w-px h-8 bg-card-border mx-2" />
           <button
             id="add-vision-btn"
             onClick={handleAddNew}
             className="min-w-12 w-12 h-12 sm:min-w-14 sm:w-14 sm:h-14 bg-accent text-accent-contrast rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
           >
             <Plus size={24} />
           </button>
        </div>
      </header>

      {showVisionSkeleton && <VisionBoardSkeleton />}

      {!showVisionSkeleton && <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <MobileVisionList
            visions={repositoryVisions}
            sharedVisions={sharedVisions}
            onOpen={handleCardClick}
            onCreate={handleAddNew}
          />
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-16"
          >
             {/* Spotlight Grid Section */}
            <section className="relative overflow-hidden rounded-[2.25rem] border border-accent/10 bg-accent/[0.025] p-5 shadow-inner sm:p-7 lg:p-8 group/spotlight">
               <div className="absolute -right-16 -top-16 opacity-[0.04] pointer-events-none group-hover/spotlight:opacity-[0.08] transition-opacity">
                  <Target size={220} className="text-accent" />
               </div>
               
               <div className="relative z-10 mb-6 flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-contrast shadow-lg shadow-accent/20">
                     <Sparkles size={21} />
                  </div>
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/60">Priority Focus</h2>
                    <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-text-main sm:text-2xl">Active Vision Boards</h3>
                  </div>
                  <div className="h-px flex-1 bg-accent/20" />
               </div>
               
              <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {activeVisionBoards.map((vision) => (
                  <RecentVisionBoardCard
                    key={vision.id}
                    vision={vision}
                    onClick={() => handleCardClick(vision)}
                  />
                ))}
              </div>

              {activeVisionBoards.length === 0 && (
                <MobileEmptyState
                  icon={<Compass size={24} />}
                  title="No Vision Boards yet."
                  description="Create or edit a Vision Board and your active boards will appear here."
                  className="relative z-10 min-h-56 bg-card/60 transition-all duration-700 hover:border-accent/40"
                  action={
                    <button
                      type="button"
                      onClick={handleAddNew}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
                    >
                      <Plus size={16} />
                      Create Vision
                    </button>
                  }
                />
                )}
            </section>

            {/* Rest of the visions */}
            <section className="space-y-12 pb-20">
               <SharedWithMeCard visions={sharedVisions} onOpen={handleCardClick} />

               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-card-border flex items-center justify-center text-text-secondary">
                        <Layers size={22} />
                    </div>
                    <div>
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/40">Knowledge Base</h2>
                      <h3 className="text-2xl font-black text-text-main tracking-tight uppercase mt-1">Idea Repository</h3>
                      <p className="text-xs font-bold text-text-secondary/50 mt-1">{repositoryVisions.length} saved board{repositoryVisions.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={refreshRepository}
                      disabled={isRefreshing}
                      className="h-10 px-4 rounded-xl bg-card text-text-secondary hover:text-accent text-[10px] font-black uppercase tracking-widest border border-card-border flex items-center gap-2 disabled:opacity-60"
                    >
                      {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Refresh
                    </button>
                    <span className="h-10 px-5 rounded-xl bg-surface-muted/70 text-text-secondary/60 text-[10px] font-black uppercase tracking-widest border border-card-border flex items-center" title="Filters and sorting are intentionally hidden until the beta board flows are stable.">
                      All visions
                    </span>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {repositoryVisions.map(v => (
                    <VisionCard
                      key={v.id}
                      vision={v}
                      onClick={() => handleCardClick(v)}
                      gridSpan="small"
                      isSquare={true}
                      className="group hover:border-accent/20"
                    />
                  ))}
               </div>
               {repositoryVisions.length === 0 && (
                <MobileEmptyState
                  icon={<Layers size={24} />}
                  title="No saved Vision Boards yet."
                  description="Create your first Vision or refresh if your boards are not showing."
                  action={
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={handleAddNew}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
                      >
                        <Plus size={16} />
                        Create Vision
                      </button>
                      <button
                        onClick={refreshRepository}
                        disabled={isRefreshing}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-card-border bg-app-container px-5 text-[10px] font-black uppercase tracking-widest text-text-main disabled:opacity-60"
                      >
                        {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Refresh boards
                      </button>
                    </div>
                  }
                />
               )}
            </section>

            {/* Daily Journal Section */}
            <DailyJournal />
          </motion.div>
        ) : (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-[600px]"
          >
             <KanbanBoard onCardClick={handleCardClick} />
          </motion.div>
        )}
      </AnimatePresence>}


      <VisionDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseVision}
        vision={selectedVision}
      />

      <AnimatePresence>
        {setupVision && (
          <VisionSetupOverlay
            vision={setupVision}
            onComplete={handleSetupComplete}
            onCancel={() => setSetupVision(null)}
          />
        )}
        {setupVision && <VisionHints />}
      </AnimatePresence>
    </div>
  );
}

function VisionBoardSkeleton() {
  return (
    <div className="space-y-12" aria-label="Loading Vision Boards">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-accent/10 bg-accent/[0.025] p-5 shadow-inner sm:p-7 lg:p-8">
        <div className="relative z-10 mb-6 flex items-center gap-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-accent/15" />
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-full bg-accent/15" />
            <div className="h-7 w-56 animate-pulse rounded-full bg-surface-muted" />
          </div>
          <div className="h-px flex-1 bg-accent/10" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="min-h-[168px] rounded-[1.6rem] border border-card-border bg-card/80 p-4 shadow-sm">
              <div className="h-20 rounded-2xl border border-card-border bg-bg-base/45 animate-pulse" />
              <div className="mt-5 space-y-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-5 w-3/4 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-surface-muted" />
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded-full bg-surface-muted" />
              <div className="h-7 w-48 animate-pulse rounded-full bg-surface-muted" />
            </div>
          </div>
          <div className="hidden h-10 w-32 animate-pulse rounded-xl bg-surface-muted sm:block" />
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="aspect-square rounded-[2rem] border border-card-border bg-card p-4 shadow-sm">
              <div className="h-1/2 rounded-[1.5rem] bg-surface-muted animate-pulse" />
              <div className="mt-5 space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MobileVisionList({
  visions,
  sharedVisions,
  onOpen,
  onCreate,
}: {
  visions: Vision[];
  sharedVisions: Vision[];
  onOpen: (vision: Vision) => void;
  onCreate: () => void;
}) {
  const groups: Array<{ id: Vision['status'] | 'shared'; label: string; description: string; items: Vision[] }> = [
    { id: 'in-progress', label: 'Doing', description: 'Active goals that need proof next.', items: visions.filter(vision => vision.status === 'in-progress') },
    { id: 'planning', label: 'Planning', description: 'Ideas becoming structured plans.', items: visions.filter(vision => vision.status === 'planning' || vision.status === 'idea') },
    { id: 'completed', label: 'Completed', description: 'Finished Visions and proof archives.', items: visions.filter(vision => vision.status === 'completed') },
    { id: 'shared', label: 'Shared With Me', description: 'Vision Team boards you can open.', items: sharedVisions },
  ];

  return (
    <motion.div
      key="list"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="space-y-5 lg:hidden"
    >
      <section className="rounded-[2rem] border border-accent/20 bg-accent/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Mobile List View</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-text-main">Edit without canvas friction.</h2>
        <p className="mt-2 text-sm font-semibold leading-5 text-text-secondary">
          Open a Vision, review tasks and proof, or create a new board without pinching around a tiny canvas.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/20"
        >
          <Plus size={16} />
          Create Vision
        </button>
      </section>

      {groups.map(group => (
        <section key={group.id} className="rounded-[2rem] border border-card-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary/60">{group.label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-text-secondary">{group.description}</p>
            </div>
            <span className="rounded-full bg-card-dark px-3 py-1.5 text-[9px] font-black text-text-secondary">
              {group.items.length}
            </span>
          </div>

          <div className="space-y-2">
            {group.items.map(vision => (
              <button
                key={`${group.id}-${vision.id}`}
                type="button"
                onClick={() => onOpen(vision)}
                className="w-full rounded-2xl border border-card-border bg-app-container p-3 text-left active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-black leading-snug text-text-main">{vision.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-text-secondary">
                      {vision.description || vision.tasks?.[0]?.text || 'No description yet.'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-2xl bg-card px-3 py-2 text-xs font-black text-accent">
                    {vision.progress || 0}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, vision.progress || 0)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-text-secondary/55">
                  <span className="rounded-full bg-card px-2 py-1">{safeArray(vision.tasks).filter(task => !task.completed).length} tasks</span>
                  <span className="rounded-full bg-card px-2 py-1">{safeArray(vision.elements).length} board items</span>
                  <span className="rounded-full bg-card px-2 py-1">{safeFormat(vision.updatedAt || vision.createdAt, 'MMM d')}</span>
                </div>
              </button>
            ))}
            {group.items.length === 0 && (
              <MobileEmptyState
                title={`No ${group.label.toLowerCase()} boards.`}
                description={group.description}
                className="min-h-44 bg-app-container p-5 shadow-none"
              />
            )}
          </div>
        </section>
      ))}
    </motion.div>
  );
}

function RecentVisionBoardCard({ vision, onClick }: { vision: Vision; onClick: () => void }) {
  const boardItems = safeArray(vision.elements);
  const completedTasks = safeArray(vision.tasks).filter(task => task.completed).length;
  const totalTasks = safeArray(vision.tasks).length;
  const previewItems = boardItems.filter(item => item.type !== 'connector').slice(0, 5);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className="group/board relative min-h-[168px] overflow-hidden rounded-[1.6rem] border border-card-border bg-card/85 p-4 text-left shadow-sm transition-all hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5"
    >
      <div className="absolute inset-x-4 top-4 h-20 rounded-2xl border border-card-border bg-bg-base/45 bg-[radial-gradient(circle,rgba(120,120,120,0.18)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute right-6 top-7 flex -space-x-2 opacity-80 transition-opacity group-hover/board:opacity-100">
        {previewItems.length ? previewItems.map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className={cn(
              "block h-8 w-10 rounded-lg border border-card bg-accent/10 shadow-sm",
              item.type === 'image' && "bg-success/15",
              item.type === 'sticky' && "bg-warning/25",
              item.type === 'checklist' && "bg-info/15",
              item.type === 'link' && "bg-accent/20"
            )}
            style={{ transform: `translateY(${index % 2 ? 8 : 0}px) rotate(${index % 2 ? 4 : -4}deg)` }}
          />
        )) : (
          <span className="block h-8 w-10 rounded-lg border border-dashed border-card-border bg-card/60" />
        )}
      </div>

      <div className="relative z-10 flex min-h-[136px] flex-col justify-end">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(vision.tags || []).slice(0, 2).map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-lg border border-card-border bg-bg-base/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-text-secondary/60">
                {tag}
              </span>
            ))}
          </div>
          <h4 className="line-clamp-2 text-base font-black uppercase leading-tight tracking-tight text-text-main group-hover/board:text-accent">
            {vision.title || 'Untitled Vision'}
          </h4>
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-text-secondary/55">
            <span>{boardItems.length} item{boardItems.length === 1 ? '' : 's'}</span>
            <span>{completedTasks}/{totalTasks} tasks</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full border border-card-border/50 bg-surface-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, vision.progress || 0))}%` }}
              className="h-full rounded-full bg-accent"
            />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/40">
            Edited {safeFormat(vision.updatedAt || vision.createdAt, 'MMM d')}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
