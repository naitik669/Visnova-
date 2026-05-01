import { motion } from 'motion/react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Zap, Shield, Flame, Target, Trophy, Clock, Users } from 'lucide-react';

export default function Circle() {
  const { circle, user, sharedVisions, acceptVision } = useStore();

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20 pt-10">
      {/* Shared Visions Section */}
      {sharedVisions.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Users size={20} className="text-accent" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-main">Shared with You</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {sharedVisions.map((vision) => (
              <div key={vision.id} className="system-card p-6 bg-accent/[0.03] border-accent/20 flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-accent-contrast">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-main text-lg tracking-tight">{vision.title}</h3>
                    <p className="text-xs text-text-secondary font-medium  opacity-70">{vision.notes}</p>
                  </div>
                </div>
                <button
                  onClick={() => acceptVision(vision.id)}
                  className="px-6 py-2 bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20"
                >
                  Join Strategic Mission
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grid of circle members */}
      <div className="grid grid-cols-1 gap-6">
        {circle.map((member) => (
          <div key={member.id} className="system-card p-8 bg-card border-card-border flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-accent/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className={cn(
                    "w-20 h-20 rounded-3xl border-4 border-bg-base shadow-xl transition-all",
                    member.isGrinding ? "ring-4 ring-accent ring-offset-4 scale-105" : "grayscale opacity-50"
                  )}
                />
                {member.isGrinding && (
                  <div className="absolute -top-3 -right-3 px-3 py-1 bg-accent text-accent-contrast text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg animate-bounce">
                    Grinding
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-text-main tracking-tight">{member.name}</h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs uppercase tracking-widest">
                      <Flame size={14} fill="currentColor" /> {member.streak} Day Streak
                   </div>
                   <div className="w-1 h-1 rounded-full bg-card-border" />
                   <div className="text-text-secondary text-xs font-bold uppercase tracking-widest">
                      {member.count} Sessions Today
                   </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10">
               <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-text-secondary/60 mb-1">Consistency Index</p>
                  <p className={cn(
                    "text-2xl font-black tabular-nums",
                    member.count > 5 ? "text-accent" : "text-text-main"
                  )}>{Math.min(100, member.count * 12)}%</p>
               </div>
               <div className="w-px h-10 bg-card-border" />
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-text-main">Status Active</span>
                  </div>
                  <p className="text-[10px] font-bold text-text-secondary ">Locked onto Objective Alpha</p>
               </div>
            </div>
          </div>
        ))}

        {/* Your personal card in the circle view */}
        <div className="system-card p-8 bg-accent/[0.02] border-accent/20 border-dashed flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className={cn(
                    "w-20 h-20 rounded-3xl border-4 border-bg-base shadow-xl transition-all",
                    user.isGrinding ? "ring-4 ring-accent ring-offset-4 scale-105" : ""
                  )}
                />
                {user.isGrinding && (
                  <div className="absolute -top-3 -right-3 px-3 py-1 bg-accent text-accent-contrast text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    Current Focus
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-text-main tracking-tight">{user.name} <span className="text-text-secondary font-light text-sm  ml-2">(You)</span></h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs uppercase tracking-widest">
                      <Flame size={14} fill="currentColor" /> {user.streak} Day Streak
                   </div>
                   <div className="w-1 h-1 rounded-full bg-card-border" />
                   <div className="text-text-secondary text-xs font-bold uppercase tracking-widest">
                      Rank: {user.rank}
                   </div>
                </div>
              </div>
            </div>

            <button className="px-8 py-3 rounded-2xl border-2 border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-accent-contrast transition-all">
              Invite to Circle
            </button>
        </div>
      </div>

      {/* Circle Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="system-card p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
               <Flame size={20} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Circle Streak</p>
               <h4 className="text-3xl font-bold text-text-main">412 Days</h4>
            </div>
         </div>
         <div className="system-card p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
               <Zap size={20} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Total Focus</p>
               <h4 className="text-3xl font-bold text-text-main">1.2k Sessions</h4>
            </div>
         </div>
         <div className="system-card p-8 space-y-4 border-accent/20">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
               <Trophy size={20} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Active Rank</p>
               <h4 className="text-3xl font-bold text-text-main">Apex Squad</h4>
            </div>
         </div>
      </div>
    </div>
  );
}
