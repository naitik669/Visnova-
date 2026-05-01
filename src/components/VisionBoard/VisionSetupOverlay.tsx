import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Sparkles, Plus, ArrowRight, Check, X, Bookmark, Globe, Layout, Zap } from 'lucide-react';
import { Vision, Task } from '../../types';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { VISION_TEMPLATES, VisionTemplate } from '../../constants/templates';

interface VisionSetupOverlayProps {
  vision: Vision;
  onComplete: (updates: Partial<Vision>) => void;
  onCancel: () => void;
}

export default function VisionSetupOverlay({ vision, onComplete, onCancel }: VisionSetupOverlayProps) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<VisionTemplate | null>(null);
  const [data, setData] = useState({
    title: vision.title,
    description: vision.description,
    tags: vision.tags,
    status: vision.status,
    tasks: vision.tasks || [] as Task[]
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const steps = [
    {
      title: "Choose a Starting Point",
      desc: "Select a pre-defined template or start from scratch.",
      icon: Layout
    },
    {
      title: "Name your goal",
      desc: "What is the primary objective of this vision?",
      icon: Target
    },
    {
      title: "Categorize",
      desc: "Apply tags to help organize your strategic landscape.",
      icon: Bookmark
    },
    {
      title: "Vision Statement",
      desc: "Briefly describe what success looks like.",
      icon: Sparkles
    }
  ];

  const handleTemplateSelect = (template: VisionTemplate | null) => {
    if (template) {
      setSelectedTemplate(template);
      setData({
        ...data,
        title: template.title,
        description: template.description,
        tags: template.tags,
        tasks: template.suggestedTasks.map(t => ({
          ...t,
          id: Math.random().toString(36).substring(7)
        })) as Task[]
      });
    } else {
      setSelectedTemplate(null);
      setData({
        ...data,
        title: '',
        description: '',
        tags: [],
        tasks: []
      });
    }
    nextStep();
  };

  const handleComplete = () => {
    onComplete(data);
  };

  const tagSuggestions = ['Mind', 'Body', 'Spirit', 'Career', 'Finance', 'Social', 'Leisure', 'Tech'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-app-container/40 backdrop-blur-3xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-card border border-card-border rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-surface-muted">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${((step + 1) / 4) * 100}%` }}
             className="h-full bg-accent"
           />
        </div>

        <button 
          onClick={onCancel}
          className="absolute top-8 right-8 text-text-secondary/30 hover:text-danger transition-colors"
        >
          <X size={24} />
        </button>

        <div className="space-y-12">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                {React.createElement(steps[step].icon, { size: 24 })}
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent opacity-60">Step {step + 1} of 4</p>
                <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">{steps[step].title}</h2>
             </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-[300px]"
            >
              {step === 0 && (
                <div className="space-y-6">
                  <p className="text-text-secondary font-medium leading-relaxed">{steps[0].desc}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleTemplateSelect(null)}
                      className="p-6 rounded-3xl border-2 border-dashed border-card-border hover:border-accent/40 hover:bg-accent/5 flex flex-col items-center justify-center text-center gap-4 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-text-secondary group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-text-main">Start from Scratch</p>
                        <p className="text-xs text-text-secondary/60">Define your own path</p>
                      </div>
                    </button>
                    {VISION_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-6 rounded-3xl border-2 border-card-border hover:border-accent/40 hover:bg-accent/5 flex flex-col items-start text-left gap-4 transition-all group relative overflow-hidden"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-accent shadow-sm" style={{ backgroundColor: `${template.color}20` }}>
                           <Zap size={20} style={{ color: template.color }} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-text-main group-hover:text-accent transition-colors">{template.title}</p>
                          <p className="text-xs text-text-secondary/60 line-clamp-2">{template.description}</p>
                        </div>
                        <div className="flex gap-1 mt-auto">
                           {template.tags.slice(0, 2).map(tag => (
                             <span key={tag} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary/60 border border-card-border">
                               {tag}
                             </span>
                           ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-text-secondary font-medium leading-relaxed">{steps[1].desc}</p>
                  <input
                    autoFocus
                    type="text"
                    value={data.title}
                    onChange={e => setData({...data, title: e.target.value})}
                    placeholder="e.g., Master Productivity Systems"
                    className="w-full h-16 px-6 rounded-2xl bg-card border border-card-border text-lg font-bold text-text-main focus:outline-none focus:border-accent transition-all placeholder:opacity-30"
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                     {['Deep Work', 'Personal Growth', 'Fitness', 'Software Mastery'].map(sug => (
                       <button 
                        key={sug}
                        onClick={() => setData({...data, title: sug})}
                        className="px-4 py-1.5 rounded-full border border-card-border text-[10px] font-black uppercase tracking-wider text-text-secondary hover:text-accent hover:border-accent transition-all"
                       >
                         + {sug}
                       </button>
                     ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <p className="text-text-secondary font-medium leading-relaxed">{steps[2].desc}</p>
                  <div className="flex flex-wrap gap-3">
                    {tagSuggestions.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const tags = data.tags.includes(tag) 
                            ? data.tags.filter(t => t !== tag)
                            : [...data.tags, tag];
                          setData({...data, tags});
                        }}
                        className={cn(
                          "px-6 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all",
                          data.tags.includes(tag) 
                            ? "bg-accent border-accent text-accent-contrast shadow-lg shadow-accent/20" 
                            : "bg-surface-muted border-card-border text-text-secondary hover:border-accent/40"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-text-secondary font-medium leading-relaxed">{steps[3].desc}</p>
                  <textarea
                    autoFocus
                    value={data.description}
                    onChange={e => setData({...data, description: e.target.value})}
                    placeholder="Describe your vision in a few sentences..."
                    className="w-full h-40 p-6 rounded-2xl bg-card border border-card-border text-base font-medium text-text-main focus:outline-none focus:border-accent transition-all placeholder:opacity-30 resize-none"
                  />
                  {data.tasks.length > 0 && (
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Template Tasks Included</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-text-secondary/80">
                        {data.tasks.map((t, idx) => (
                          <span key={idx} className="bg-white/50 px-2 py-1 rounded-lg border border-card-border">• {t.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-8 border-t border-card-border">
             <button 
               onClick={step === 0 ? onCancel : prevStep}
               className="text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main transition-colors"
             >
               {step === 0 ? 'Cancel' : 'Back'}
             </button>
             
             {step > 0 && (
               <button 
                 onClick={step === 3 ? handleComplete : nextStep}
                 disabled={step === 1 && !data.title.trim()}
                 className={cn(
                   "h-14 px-10 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100",
                 )}
               >
                 {step === 3 ? 'Initialize Vision' : 'Next Step'} 
                 {step === 3 ? <Check size={16} /> : <ArrowRight size={16} />}
               </button>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

