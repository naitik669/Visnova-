import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { X, Sparkles, Map, BookOpen, MessageCircle, Link2, MapPin, Plus, Shield, Zap, Award, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function UserProfileModal() {
  const { selectedProfileId, setSelectedProfileId, user: currentUser, session, userCircles, addToCircle, removeFromCircle, toggleFollow, followingIds } = useStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [showCircleMenu, setShowCircleMenu] = useState(false);

  const currentCircle = selectedProfileId ? userCircles[selectedProfileId] : null;

  const handleCircleAdd = async (type: 'friend' | 'close_friend' | 'collaborator') => {
    if (!selectedProfileId) return;
    await addToCircle(selectedProfileId, type);
    setShowCircleMenu(false);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!selectedProfileId) return;
      setIsLoading(true);
      const targetId = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .single();
        
        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching modal profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [selectedProfileId, session?.user?.id]);

  if (!selectedProfileId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedProfileId(null)}
          className="absolute inset-0 bg-overlay/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-app-container rounded-[2.5rem] shadow-2xl overflow-hidden border border-card-border z-[101]"
        >
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
               <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Loading Profile...</p>
            </div>
          ) : (
            <>
              <div className="h-40 bg-accent/20 relative">
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center mix-blend-overlay opacity-30" />
                 <div className="absolute inset-0 bg-gradient-to-t from-app-container to-transparent" />
                 <button
                   onClick={() => setSelectedProfileId(null)}
                   className="absolute top-6 right-6 w-10 h-10 bg-card rounded-xl text-text-secondary flex items-center justify-center hover:text-accent transition-all z-20 border border-card-border"
                 >
                   <X size={20} />
                 </button>
              </div>

              <div className="px-10 pb-10">
                 <div className="flex flex-col sm:flex-row gap-8 relative -mt-16 mb-10">
                   <div className="relative shrink-0">
                      <div className="w-32 h-32 rounded-[2rem] p-1 bg-app-container shadow-2xl">
                        <img src={profile?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + profile?.id} alt={profile?.full_name} className="w-full h-full rounded-[1.8rem] object-cover border-2 border-card-border bg-card" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-accent text-accent-contrast w-10 h-10 rounded-xl border-4 border-app-container flex items-center justify-center shadow-lg">
                        <Shield size={18} />
                      </div>
                   </div>

                   <div className="pt-2 sm:pt-20 flex-1">
                     <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black text-text-main tracking-tight uppercase flex items-center gap-3">
                            {profile?.full_name || profile?.display_name || 'Explorer'}
                          </h2>
                          <p className="text-xs font-black text-accent uppercase tracking-[0.2em]">{profile?.role || 'Vison Architect'} • LVL {profile?.level || 1}</p>
                        </div>
                        {selectedProfileId === 'me' ? (
                          <button 
                            onClick={() => {
                              setSelectedProfileId(null);
                              navigate('/profile?tab=settings');
                            }}
                            className="h-12 w-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-sm font-black"
                          >
                             <Zap size={20} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={async () => {
                                 if (isLoadingFollow) return;
                                 setIsLoadingFollow(true);
                                 await toggleFollow(selectedProfileId!);
                                 setIsLoadingFollow(false);
                               }}
                               className={cn(
                                 "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3",
                                 followingIds.includes(selectedProfileId!) 
                                   ? "bg-surface-muted text-text-secondary border border-card-border" 
                                   : "bg-accent text-accent-contrast shadow-accent/20 hover:scale-105 active:scale-95"
                               )}
                             >
                                {isLoadingFollow ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : followingIds.includes(selectedProfileId!) ? (
                                  "Following"
                                ) : (
                                  <><Plus size={16} /> Follow</>
                                )}
                             </button>
                             <div className="relative">
                               <button 
                                 onClick={() => setShowCircleMenu(!showCircleMenu)}
                                 className={cn(
                                   "h-12 w-12 rounded-2xl flex items-center justify-center transition-all border",
                                   currentCircle 
                                     ? "bg-warning/10 border-warning/30 text-warning" 
                                     : "bg-surface-muted border-card-border text-text-secondary hover:text-text-main"
                                 )}
                               >
                                  <Users size={20} />
                               </button>

                               <AnimatePresence>
                                 {showCircleMenu && (
                                   <motion.div
                                     initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                     animate={{ opacity: 1, scale: 1, y: 0 }}
                                     exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                     className="absolute top-full right-0 mt-2 w-48 bg-card border border-card-border rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                                   >
                                      <div className="p-3 border-b border-card-border/50 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">Circle Protocol</p>
                                      </div>
                                      {(['friend', 'close_friend', 'collaborator'] as const).map(type => (
                                        <button
                                          key={type}
                                          onClick={() => handleCircleAdd(type)}
                                          className={cn(
                                            "w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors",
                                            currentCircle === type ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-surface-muted hover:text-text-main"
                                          )}
                                        >
                                          {type.replace('_', ' ')}
                                        </button>
                                      ))}
                                      {currentCircle && (
                                        <button
                                          onClick={() => {
                                            removeFromCircle(selectedProfileId!);
                                            setShowCircleMenu(false);
                                          }}
                                          className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger/10 transition-colors mt-1"
                                        >
                                          Remove from Circle
                                        </button>
                                      )}
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>
                          </div>
                        )}
                     </div>
                   </div>
                 </div>

                 {/* Identity Summary */}
                 <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="p-5 bg-card/50 rounded-3xl border border-card-border/50 group hover:border-accent/30 transition-colors">
                       <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest mb-1">Status Protocol</p>
                       <p className="text-[13px] font-medium text-text-main leading-relaxed  line-clamp-2">
                          "{profile?.bio || 'In deep work mode. Zero distractions allowed.'}"
                       </p>
                    </div>
                    <div className="p-5 bg-card/50 rounded-3xl border border-card-border/50 group hover:border-accent/30 transition-colors flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center border border-warning/20">
                           <Award size={20} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest">Active Streak</p>
                           <p className="text-lg font-black text-text-main tabular-nums">{profile?.streak || 0} Days</p>
                        </div>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        setSelectedProfileId(null);
                        navigate('/community');
                      }}
                       className="flex-1 h-14 rounded-2xl bg-surface-muted border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main hover:bg-card-dark transition-all flex items-center justify-center gap-3"
                    >
                       <MessageCircle size={18} /> Send Message
                    </button>
                    <button 
                      onClick={() => {
                        if (selectedProfileId === 'me') {
                          setSelectedProfileId('me');
                          navigate('/profile');
                        } else {
                          // Navigate to specific user profile
                          navigate('/profile');
                        }
                        setSelectedProfileId(null);
                      }}
                      className="px-10 h-14 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                       View Matrix
                    </button>
                 </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
