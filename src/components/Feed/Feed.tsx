import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Share2, CornerUpRight, Globe, Zap, Target, Bookmark, Search, Compass, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const feedItems = [
  {
    id: '1',
    user: 'Alistair Vance',
    role: 'AI Engineer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
    action: 'initiated a new Vision cycle',
    target: 'Cognitive Architecture v2',
    timestamp: '2m ago',
    likes: 12,
    comments: 4
  },
  {
    id: '2',
    user: 'Elena Kostic',
    role: 'Product Manager',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
    action: 'reached 80% execution on',
    target: 'Strategic Growth Engine',
    timestamp: '15m ago',
    likes: 45,
    comments: 8
  },
  {
    id: '3',
    user: 'Marcus Thorne',
    role: 'App Developer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    action: 'posted a new insight',
    text: 'Metabolic focus is the primary driver of high-stakes output. Do not sleep on the sleep stats.',
    timestamp: '1h ago',
    likes: 89,
    comments: 21
  }
];

export default function Feed() {
  const { activities, user } = useStore();
  const [activeTab, setActiveTab] = useState<'network' | 'explore' | 'saved'>('network');

  interface FeedItem {
    id: string;
    user: string;
    role: string;
    avatar: string;
    action: string;
    timestamp: string;
    likes: number;
    comments: number;
    target?: string;
    text?: string;
  }

  const dynamicItems: FeedItem[] = activities.map(act => ({
    id: act.id,
    user: user.name,
    role: user.role || 'Digital Explorer',
    avatar: user.avatar,
    action: act.description,
    timestamp: formatDistanceToNow(act.timestamp, { addSuffix: true }),
    likes: 0,
    comments: 0,
  }));

  const allItems: FeedItem[] = [...dynamicItems, ...(feedItems as FeedItem[])];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-card-border pb-4 w-full overflow-x-auto custom-scrollbar">
         <button 
           onClick={() => setActiveTab('network')}
           className={cn("flex items-center flex-shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'network' ? "bg-text-main text-bg-base" : "text-neutral-400 hover:text-text-main hover:bg-card")}
         >
           <Users size={16} /> Network
         </button>
         <button 
           onClick={() => setActiveTab('explore')}
           className={cn("flex items-center flex-shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'explore' ? "bg-text-main text-bg-base" : "text-neutral-400 hover:text-text-main hover:bg-card")}
         >
           <Compass size={16} /> Explore
         </button>
         <button 
           onClick={() => setActiveTab('saved')}
           className={cn("flex items-center flex-shrink-0 gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'saved' ? "bg-text-main text-bg-base" : "text-neutral-400 hover:text-text-main hover:bg-card")}
         >
           <Bookmark size={16} /> Saved
         </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'network' && (
          <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {allItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="xp-block p-8 bg-card space-y-6 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                     <img src={item.avatar} className="w-12 h-12 rounded-xl object-cover xp-block" alt={item.user} />
                     <div>
                        <h4 className="text-sm font-bold text-text-main cursor-pointer hover:underline">{item.role}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-text-main font-bold tracking-widest">{item.user}</p>
                          <span className="text-[10px] text-neutral-500">•</span>
                          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">{item.timestamp}</p>
                        </div>
                     </div>
                  </div>
                  <button className="p-2 text-neutral-300 hover:text-accent transition-colors">
                     <CornerUpRight size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                   <p className="text-sm text-text-main font-medium leading-relaxed">
                      {item.action} 
                      {item.target && <span className="text-accent font-bold ml-1">"{item.target}"</span>}
                   </p>
                   {item.text && (
                     <div className="p-6 bg-accent-soft border-l-4 border-accent text-sm italic font-medium">
                        "{item.text}"
                     </div>
                   )}
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-card-border">
                   <button className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-red-500 transition-colors">
                      <Heart size={16} />
                      <span>{item.likes}</span>
                   </button>
                   <button className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-accent transition-colors">
                      <MessageSquare size={16} />
                      <span>{item.comments}</span>
                   </button>
                   <button className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-text-main transition-colors ml-auto">
                      <Bookmark size={16} />
                   </button>
                   <button className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-text-main transition-colors">
                      <Share2 size={16} />
                   </button>
                </div>
              </motion.div>
            ))}

            <div className="p-12 xp-block border-dashed border-card-border bg-accent-soft flex flex-col items-center justify-center text-center gap-6 mt-12">
               <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center shadow-sm xp-block">
                  <Target className="text-accent" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-bold text-text-main">Resonance Found</h3>
                  <p className="text-sm text-neutral-400 max-w-sm mx-auto">
                     You and 34 others shared the "Deep Flow" vibe in the last hour.
                  </p>
               </div>
               <button className="xp-button bg-text-main text-bg-base text-[10px] uppercase font-black tracking-widest">
                  Broadcast Achievement
               </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'explore' && (
          <motion.div key="explore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
             <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
               <input 
                 type="text" 
                 placeholder="Search people, tags, or visions..." 
                 className="w-full bg-card border-none xp-block pl-12 pr-4 py-4 text-text-main font-bold focus:outline-none focus:border-accent transition-colors"
               />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="xp-block p-6 bg-accent-soft space-y-4">
                  <h3 className="font-bold text-text-main flex items-center gap-2"><Target size={18} className="text-accent" /> Trending Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {['#DeepFlow', '#ADHD', '#SystemDesign', '#Fitness'].map(tag => (
                      <span key={tag} className="px-3 py-1 bg-card border border-card-border rounded-lg text-xs font-bold text-neutral-500 cursor-pointer hover:border-accent hover:text-text-main transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="xp-block p-6 bg-accent-soft space-y-4">
                  <h3 className="font-bold text-text-main flex items-center gap-2"><Users size={18} className="text-accent" /> Suggested Connections</h3>
                  <div className="space-y-4">
                     {[1,2].map(i => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-card border border-card-border hover:border-accent cursor-pointer transition-colors" />
                            <div>
                              <p className="text-xs font-bold text-text-main">Neural Pioneer {i}</p>
                              <p className="text-[10px] text-neutral-400 uppercase">95% Alignment</p>
                            </div>
                          </div>
                          <button className="px-3 py-1 bg-card border border-card-border rounded-lg text-[10px] font-bold uppercase transition-colors hover:bg-text-main hover:text-bg-base">Connect</button>
                        </div>
                     ))}
                  </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'saved' && (
          <motion.div key="saved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-64 flex flex-col items-center justify-center text-neutral-400 xp-block border-dashed bg-accent-soft">
             <Bookmark size={32} className="mb-4 opacity-50" />
             <p className="font-semibold text-sm">No saved posts.</p>
             <p className="text-xs mt-1 opacity-70">Save insights and milestones to build your library.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
