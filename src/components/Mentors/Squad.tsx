import { motion } from 'motion/react';
import { Mail, MessageCircle, Star, Zap, Globe, Shield, Map as MapIcon, Navigation, Compass, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const mentors = [
  {
    name: 'Dr. Alistair Vance',
    role: 'Systems Thinking',
    status: 'Online',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
    tags: ['Advisory', 'Deep Tech'],
    score: 98,
  },
  {
    name: 'Elena Kostic',
    role: 'Product Strategy & Growth',
    status: 'Away',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
    tags: ['Strategic', 'Bio-Hacking'],
    score: 92,
  },
  {
    name: 'Marcus Thorne',
    role: 'Executive Performance',
    status: 'Offline',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    tags: ['Mindset', 'Focus'],
    score: 85,
  }
];

function VisionMap({ mentors }: { mentors: any[] }) {
  return (
    <div className="xp-block bg-card-dark h-[600px] relative overflow-hidden flex items-center justify-center">
       <div className="absolute inset-0">
          <svg className="w-full h-full opacity-20">
             <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
             </pattern>
             <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
       </div>

       {mentors.map((m, idx) => (
         <motion.div
           key={`${m.name}-${idx}`}
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           className="absolute group cursor-pointer"
           style={{
             top: `${30 + idx * 25}%`,
             left: `${20 + idx * 30}%`
           }}
         >
           <div className="relative">
              <div className="absolute inset-0 bg-accent/40 rounded-full blur-xl group-hover:blur-2xl transition-all animate-pulse" />
              <img src={m.avatar} className="w-16 h-16 rounded-full border-2 border-accent relative z-10 xp-block" />
              <div className="absolute top-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-accent z-20" />
           </div>

           <div className="absolute top-18 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-30">
              <div className="xp-block bg-card p-4 text-center">
                 <h4 className="text-xs font-black uppercase text-text-main">{m.name}</h4>
                 <p className="text-[10px] text-text-secondary/60 mt-1">{m.role}</p>
                 <div className="mt-2 pt-2 border-t border-card-border flex items-center justify-center gap-2">
                    <Navigation size={10} className="text-accent" />
                    <span className="text-[9px] font-bold text-text-secondary">Executing "Strategic Audit"</span>
                 </div>
              </div>
           </div>
         </motion.div>
       ))}

       <div className="absolute bottom-8 left-8 flex items-center gap-3">
          <div className="xp-block bg-accent text-accent-contrast px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
             <Activity size={12} /> Live Resonance: 94%
          </div>
       </div>
    </div>
  );
}

export default function Squad() {
  const [view, setView] = useState<'list' | 'map'>('list');

  return (
    <div className="max-w-[1500px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-10">
      {view === 'map' ? (
        <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-card-border rounded-3xl opacity-30  text-sm text-center px-10">
           Vision Visualization Offline. Focus on direct tactical communication.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mentors.map((mentor, idx) => (
            <motion.div
              key={`${mentor.name}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="system-card group p-8 flex flex-col gap-8 relative overflow-hidden"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="relative">
                  <img
                    src={mentor.avatar || undefined}
                    className="w-20 h-20 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    alt={mentor.name}
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-card shadow-sm",
                    mentor.status === 'Online' ? "bg-success" : mentor.status === 'Away' ? "bg-warning" : "bg-card-dark"
                  )} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-warning">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold text-text-main">{mentor.score}</span>
                  </div>
                  <span className="text-[10px] font-medium text-text-secondary/40 uppercase tracking-widest">{mentor.status}</span>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <h3 className="text-xl font-bold tracking-tight text-text-main">{mentor.name}</h3>
                <p className="text-sm text-text-secondary/60 font-medium">{mentor.role}</p>
              </div>

              <div className="flex flex-wrap gap-2 relative z-10">
                {mentor.tags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="px-3 py-1 bg-accent-soft text-[10px] font-bold text-text-secondary/60 rounded-full border border-card-border">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-6 border-t border-card-border flex items-center gap-3 relative z-10">
                <button className="flex-1 py-3 bg-text-main text-bg-base rounded-xl text-xs font-bold hover:bg-accent transition-all flex items-center justify-center gap-2">
                  <MessageCircle size={14} /> Brief
                </button>
                <button className="p-3 bg-accent-soft text-text-secondary/60 hover:text-text-main rounded-xl transition-all border border-card-border">
                  <Globe size={18} />
                </button>
              </div>

              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16" />
            </motion.div>
          ))}
        </div>
      )}

      <div className="system-card p-12 bg-accent-soft border-dashed border-card-border flex flex-col items-center justify-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center shadow-sm">
           <Zap className="text-accent" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Expand Your Network</h3>
          <p className="text-sm text-text-secondary/60 max-w-sm mx-auto">
            Our AI continuously matches you with mentors based on your Mission progress and Metabolic Vitals.
          </p>
        </div>
        <button className="px-8 py-3 bg-card border border-card-border rounded-full text-xs font-bold hover:border-text-main hover:text-text-main transition-all">
          Request Tactical Match
        </button>
      </div>
    </div>
  );
}
