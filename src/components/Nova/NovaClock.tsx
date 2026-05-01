import { motion } from 'motion/react';
import { Clock, Plus, Video, Link as LinkIcon, FileText, Send, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

interface Capsule {
  id: string;
  title: string;
  openDate: string;
  content: {
    text?: string;
    video?: string;
    links: string[];
    checklist: { id: string; text: string; completed: boolean }[];
  };
  status: 'sealed' | 'open';
}

export default function NovaClock() {
  const [capsules, setCapsules] = useState<Capsule[]>([
    {
      id: '1',
      title: 'Post-Quantum Success',
      openDate: '2026-12-25T00:00:00',
      content: {
        text: 'If you are reading this, you have mastered the basics of Qiskit.',
        links: ['https://quantum-computing.ibm.com/'],
        checklist: [
          { id: 't1', text: 'Earn IBM Developer Certification', completed: false },
          { id: 't2', text: 'Build a 3-qubit circuit', completed: true }
        ]
      },
      status: 'sealed'
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-card-border">
        <div className="flex items-center gap-3 text-success">
             <Clock size={20} className="animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary/60">Temporal Architecture</span>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="xp-button flex items-center gap-2 bg-success/10 text-success border-success/20"
        >
          <Plus size={18} />
          <span>New Time Capsule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {capsules.map((capsule) => {
          const isOpen = new Date(capsule.openDate) <= new Date();
          return (
            <motion.div
              key={capsule.id}
              className={cn(
                "xp-block p-8 flex flex-col gap-6 bg-card text-text-main relative",
                !isOpen && "opacity-80"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                   <h3 className="text-xl font-bold tracking-tight">{capsule.title}</h3>
                   <div className="flex items-center gap-2 text-text-secondary/60 text-xs">
                      <Calendar size={14} />
                      <span>Opens {new Date(capsule.openDate).toLocaleDateString()}</span>
                   </div>
                </div>
                <div className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2",
                  isOpen ? "bg-success/10 text-success border-success" : "bg-accent-soft text-text-secondary/60 border-card-border"
                )}>
                  {isOpen ? 'Accessible' : 'Sealed'}
                </div>
              </div>

              {!isOpen ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-accent-soft border-2 border-dashed border-card-border">
                    <Clock size={40} className="text-text-secondary/40" />
                    <div className="space-y-1">
                       <p className="text-sm font-bold text-text-main">Time Lock Active</p>
                       <p className="text-[10px] text-text-secondary/60 uppercase tracking-widest">Awaiting temporal alignment</p>
                    </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-text-main leading-relaxed  border-l-4 border-success pl-4 py-2 bg-success/10">
                    "{capsule.content.text}"
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="xp-block p-4 bg-accent-soft space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary/60">Assets</p>
                        <div className="flex items-center gap-3">
                          <Video size={16} className="text-success" />
                          <LinkIcon size={16} className="text-blue-500" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary/60 flex items-center gap-2">
                        <CheckSquare size={14} /> Future Checklist
                     </p>
                     <div className="space-y-2">
                        {capsule.content.checklist.map(item => (
                          <div key={item.id} className="flex items-center gap-3 text-sm px-4 py-3 bg-accent-soft border-2 border-card-border">
                             <div className={cn("w-4 h-4 border-2 border-accent rounded-sm", item.completed && "bg-success")} />
                             <span className={item.completed ? "line-through opacity-50" : "font-semibold"}>{item.text}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              )}

              <button className="w-full xp-button mt-4 flex items-center justify-center gap-2 text-xs">
                <Send size={14} />
                <span>Sync with Gmail Archive</span>
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="system-card p-12 bg-accent/5 border-dashed border-accent/20 flex flex-col items-center justify-center gap-6 text-center">
         <div className="xp-block p-4 bg-card rotate-3">
            <Sparkles className="text-accent" />
         </div>
         <div className="space-y-2">
            <h3 className="text-xl font-bold">Temporal Paradox Prevention</h3>
            <p className="text-xs text-text-secondary/60 max-w-sm mx-auto leading-relaxed">
              Once a capsule is sealed, its code is encrypted with your current mood and interest hash. It cannot be opened until the atomic clock matches your requested date.
            </p>
         </div>
      </div>
    </div>
  );
}
