/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Filter,
  Target,
  Sparkles,
  Trello,
  Compass,
  Layers
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

export default function VisionBoard() {
  const { visions, addVision, updateVision, addActivity, addToast } = useStore();
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null);
  const [setupVision, setSetupVision] = useState<Vision | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');

  // Filter for spotlight grid (e.g., top progress or in-progress)
  const spotlightVisions = visions.filter(v => v.status === 'in-progress').slice(0, 3);

  const handleCardClick = (vision: Vision) => {
    setSelectedVision(vision);
    setIsModalOpen(true);
  };

  const handleAddNew = async () => {
    const newVision = await addVision({
      title: 'New Neural Vision',
      description: '',
      tags: [],
      status: 'idea',
    });
    setSetupVision(newVision);
    addActivity({
      type: 'created',
      userId: 'me',
      description: `Primary strategic sequence started for New Neural Vision.`,
    });
  };

  const handleSetupComplete = (updates: Partial<Vision>) => {
    if (setupVision) {
      updateVision(setupVision.id, updates);
      const updatedVision = { ...setupVision, ...updates };
      setSetupVision(null);
      setSelectedVision(updatedVision);
      setIsModalOpen(true);
      addToast({
        type: 'success',
        title: 'Vision Initialized',
        description: 'Strategic objective has been successfully defined.'
      });
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-60 px-6 sm:px-12 pt-20">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-16">
        <div className="space-y-4 max-w-4xl">
           <div className="flex items-center gap-4 text-accent/60">
              <div className="w-10 h-px bg-accent/30" />
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">The Vision Board</span>
           </div>
           
           <div className="space-y-1">
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-text-main leading-[0.85] uppercase sm:-ml-1">
               Future<br/>
               <span className="text-accent underline decoration-accent/10 underline-offset-8">Vision</span>
             </h1>
           </div>

           <p className="text-text-secondary/70 font-medium max-w-xl leading-relaxed text-base border-l-2 border-accent/20 pl-6">
             Build your goals and aspirations. Align inspirations, define milestones, and manifest the specific future you are building.
           </p>
        </div>
        
        <div className="flex items-center gap-4 bg-app-container border border-card-border p-2.5 rounded-[3rem] shadow-2xl shadow-accent/5 backdrop-blur-xl">
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
             className="w-14 h-14 bg-accent text-accent-contrast rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
           >
             <Plus size={24} />
           </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-16"
          >
             {/* Spotlight Grid Section */}
            <section className="relative p-12 rounded-[3.5rem] bg-accent/[0.03] border border-accent/10 shadow-inner group/spotlight">
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover/spotlight:opacity-10 transition-opacity">
                  <Target size={300} className="text-accent" />
               </div>
               
               <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-accent-contrast shadow-lg shadow-accent/20">
                     <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/60">Priority Focus</h2>
                    <h3 className="text-2xl font-black text-text-main tracking-tight uppercase mt-1">Active Trajectories</h3>
                  </div>
                  <div className="h-px flex-1 bg-accent/20" />
               </div>
               
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10">
                {spotlightVisions.map((vision) => (
                  <VisionCard
                    key={vision.id}
                    vision={vision}
                    onClick={() => handleCardClick(vision)}
                    className="w-full bg-card/80 backdrop-blur-sm border-accent/10"
                  />
                ))}
              </div>

              {spotlightVisions.length === 0 && (
                  <div className="col-span-full py-20 border-2 border-dashed border-accent/20 rounded-[2.5rem] bg-card/40 flex flex-col items-center justify-center text-center px-10 group hover:border-accent/40 transition-all duration-700">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                      <Compass size={32} />
                    </div>
                    <h3 className="text-xl font-black text-text-main tracking-tight uppercase">Nothing here yet</h3>
                    <p className="text-text-secondary mt-2 max-w-xs text-sm font-medium">Activate a goal from your vault to get started.</p>
                  </div>
                )}
            </section>

            {/* Rest of the visions */}
            <section className="space-y-12 pb-20">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-surface-muted border border-card-border flex items-center justify-center text-text-secondary">
                        <Layers size={22} />
                    </div>
                    <div>
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/40">Knowledge Base</h2>
                      <h3 className="text-2xl font-black text-text-main tracking-tight uppercase mt-1">Idea Repository</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="h-10 px-6 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest border border-card-border hover:text-text-main transition-all">Filter</button>
                    <button className="h-10 px-6 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest border border-card-border hover:text-text-main transition-all">Sort</button>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {visions.filter(v => v.status !== 'in-progress').map(v => (
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
      </AnimatePresence>


      <VisionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
