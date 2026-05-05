import { motion } from 'motion/react';
import { Youtube, Heart, Share2, CornerUpRight, Search, Play, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

const mindNodes = [
  { id: '1', title: 'Focus Systems for Deep Work', type: 'YouTube', url: 'https://youtube.com/watch?v=...', author: 'Domain Expert', views: '2.4M', color: 'bg-danger' },
  { id: '2', title: 'Flow Philosophy', type: 'Article', author: 'Daily Zen', color: 'bg-success' },
  { id: '3', title: 'Visual Design Patterns', type: 'Dribbble', author: 'Pixel Master', color: 'bg-pink-500' },
];

export default function MindVisualizer() {
  const [activeNode, setActiveNode] = useState(mindNodes[0]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-card-border">
          <div className="flex items-center gap-3 text-danger">
             <Youtube size={20} />
             <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Growth Library</span>
          </div>

          <div className="flex bg-card rounded-full p-1 border border-card-border shadow-sm">
             <div className="flex items-center gap-3 px-6 py-2.5">
                <Search size={14} className="text-text-secondary/60" />
                <input placeholder="Search knowledge base..." className="bg-transparent text-xs font-bold outline-none w-48" />
             </div>
          </div>
       </div>

       <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-8 space-y-8">
             <div className="xp-block aspect-video bg-overlay relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-overlay via-transparent to-transparent z-10" />
                <img
                  src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=1200&h=800"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                   <button className="w-20 h-20 rounded-full bg-danger text-accent-contrast flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-danger/40">
                      <Play size={32} fill="currentColor" />
                   </button>
                </div>
                <div className="absolute bottom-8 left-8 z-20">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-danger mb-2">Active Inspiration</p>
                   <h2 className="text-3xl font-bold text-accent-contrast tracking-tight">{activeNode.title}</h2>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="system-card p-6 flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary/60">Related Focus</h4>
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                   </div>
                   <p className="text-sm font-medium text-text-main leading-relaxed">
                      This content aligns with your <span className="text-accent underline font-bold">Deep Work</span> vision. Focus on 04:22 for the key idea.
                   </p>
                </div>
                <div className="system-card p-6 flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary/60">Collaborative Insights</h4>
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={`collab-dot-${activeNode.id}-${i}`} className="w-6 h-6 rounded-full bg-card border-2 border-card-border" />
                        ))}
                      </div>
                   </div>
                   <p className="text-sm font-medium text-text-secondary/60 ">"The third step is the key to making this practical." - Dr. Vance</p>
                </div>
             </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary/60">Vision Nodes</h3>
                <Sparkles size={14} className="text-accent" />
             </div>

             <div className="space-y-4">
                {mindNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setActiveNode(node)}
                    className={cn(
                      "w-full xp-block p-6 text-left transition-all group relative overflow-hidden",
                      activeNode.id === node.id ? "bg-card border-accent" : "bg-accent-soft hover:bg-card saturate-0 hover:saturate-100"
                    )}
                  >
                    <div className="flex items-start justify-between relative z-10">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/60 group-hover:text-accent transition-colors">{node.type}</p>
                          <h4 className="text-sm font-bold tracking-tight text-text-main">{node.title}</h4>
                       </div>
                       <CornerUpRight size={14} className="text-text-secondary/40 group-hover:text-accent transition-colors" />
                    </div>
                    {activeNode.id === node.id && (
                      <div className="absolute top-0 right-0 w-2 h-full bg-accent" />
                    )}
                  </button>
                ))}
             </div>

             <div className="xp-block p-8 bg-card-dark text-text-main space-y-6">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-danger">Synergy Score</p>
                   <h3 className="text-2xl font-bold">88.4%</h3>
                </div>
                <p className="text-xs text-text-secondary/60 font-medium leading-relaxed">
                   Your current interests are highly optimized for your Q3 roadmap. Vision pathing is clear.
                </p>
                <button className="w-full xp-button bg-card text-text-main text-[10px] uppercase font-black tracking-widest mt-4">
                   Recalibrate Filter
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}
