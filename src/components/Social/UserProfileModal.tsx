import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { X, MessageCircle, Plus, Zap, Users, Heart, Flag, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../VerifiedBadge';
import { ResponsiveModal } from '../ui/ResponsiveModal';

const reportReasons = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate', label: 'Hate or abusive content' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'violence', label: 'Violence' },
  { value: 'self_harm', label: 'Self-harm concern' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'privacy', label: 'Privacy violation' },
  { value: 'illegal_content', label: 'Illegal content' },
  { value: 'other', label: 'Other' }
];

export default function UserProfileModal() {
  const { selectedProfileId, setSelectedProfileId, user: currentUser, session, userCircles, addToCircle, removeFromCircle, toggleFollow, followingIds, fetchProfileStats, reportUser } = useStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [showCircleMenu, setShowCircleMenu] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const currentCircle = selectedProfileId ? userCircles[selectedProfileId] : null;

  const handleCircleAdd = async (type: 'friend' | 'close_friend' | 'collaborator') => {
    if (!selectedProfileId) return;
    await addToCircle(selectedProfileId, type);
    setShowCircleMenu(false);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const targetId = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
      if (!targetId) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();
        
        if (error) throw error;
        if (!data && targetId === session?.user?.id) {
          setProfile({
            id: targetId,
            email: currentUser.email,
            full_name: currentUser.name,
            display_name: currentUser.name,
            username: currentUser.username,
            avatar_url: currentUser.avatar,
            bio: currentUser.bio,
            role: currentUser.role,
            level: currentUser.level,
            streak: currentUser.streak,
            verified: currentUser.verified,
          });
        } else {
          setProfile(data);
        }
        const stats = await fetchProfileStats(targetId);
        setFollowersCount(stats.followersCount);
        setFollowingCount(stats.followingCount);
      } catch (err) {
        console.error('Error fetching modal profile:', err);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [selectedProfileId, session?.user?.id, currentUser, fetchProfileStats]);

  if (!selectedProfileId) return null;

  const targetProfileId = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
  const isOwnProfile = !!targetProfileId && targetProfileId === session?.user?.id;

  const submitProfileReport = async () => {
    if (!targetProfileId || isReporting) return;
    setIsReporting(true);
    const ok = await reportUser(targetProfileId, reportReason, reportDetails);
    setIsReporting(false);
    if (ok) {
      setIsReportOpen(false);
      setReportReason('spam');
      setReportDetails('');
    }
  };

  return (
    <>
      <ResponsiveModal
        open={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
        size="md"
        className="bg-app-container"
        contentClassName="bg-app-container"
        zIndexClassName="z-[220]"
      >
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4">
               <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Loading Profile...</p>
            </div>
          ) : (
            <>
              <div className="h-32 sm:h-40 bg-accent/20 relative sticky top-0 z-10">
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center mix-blend-overlay opacity-30" />
                 <div className="absolute inset-0 bg-gradient-to-t from-app-container to-transparent" />
                 <button
                   onClick={() => setSelectedProfileId(null)}
                   className="absolute top-4 sm:top-6 right-4 sm:right-6 w-11 h-11 bg-card rounded-xl text-text-secondary flex items-center justify-center hover:text-accent transition-all z-20 border border-card-border"
                 >
                   <X size={20} />
                 </button>
              </div>

              <div className="px-4 sm:px-10 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-10">
                 <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 relative -mt-14 sm:-mt-16 mb-6 sm:mb-10">
                   <div className="relative shrink-0">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] p-1 bg-app-container shadow-2xl">
                        <img src={profile?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + profile?.id} alt={profile?.full_name} className="w-full h-full rounded-[1.8rem] object-cover border-2 border-card-border bg-card" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-card text-accent w-10 h-10 rounded-xl border-4 border-app-container flex items-center justify-center shadow-lg">
                        <VerifiedBadge verified={!!profile?.verified} />
                      </div>
                   </div>

                   <div className="pt-0 sm:pt-20 flex-1 min-w-0">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h2 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight uppercase flex items-center gap-3 break-words">
                            {profile?.full_name || profile?.display_name || 'Explorer'}
                            <VerifiedBadge verified={!!profile?.verified} className="shrink-0" />
                          </h2>
                          <p className="text-xs font-black text-accent uppercase tracking-[0.2em]">{profile?.role || 'Vision Builder'} - LVL {profile?.level || 1}</p>
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
                                 const nextFollowing = await toggleFollow(selectedProfileId!);
                                 if (nextFollowing !== null) {
                                   const targetId = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
                                   if (targetId) {
                                     const stats = await fetchProfileStats(targetId);
                                     setFollowersCount(stats.followersCount);
                                     setFollowingCount(stats.followingCount);
                                   }
                                 }
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
                                     className="visnova-menu absolute top-full right-0 mt-2 w-56 p-1.5 z-50"
                                   >
                                      <div className="px-3 py-2 border-b border-card-border/50 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">Circle</p>
                                      </div>
                                      {(['friend', 'close_friend', 'collaborator'] as const).map(type => (
                                        <button
                                          key={type}
                                          onClick={() => handleCircleAdd(type)}
                                          className={cn(
                                            "visnova-menu-item capitalize",
                                            currentCircle === type && "visnova-menu-item-active"
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
                                          className="visnova-menu-item visnova-menu-item-danger mt-1"
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
                       <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest mb-1">Bio</p>
                       <p className="text-[13px] font-medium text-text-main leading-relaxed  line-clamp-2">
                          "{profile?.bio || 'No biography provided.'}"
                       </p>
                    </div>
                    <div className="p-5 bg-card/50 rounded-3xl border border-card-border/50 group hover:border-accent/30 transition-colors grid grid-cols-2 gap-4">
                        <div>
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-2">
                           <Users size={20} />
                        </div>
                           <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest">Followers</p>
                           <p className="text-lg font-black text-text-main tabular-nums">{followersCount.toLocaleString()}</p>
                        </div>
                        <div>
                        <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center border border-danger/20 mb-2">
                           <Heart size={20} />
                        </div>
                           <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest">Following</p>
                           <p className="text-lg font-black text-text-main tabular-nums">{followingCount.toLocaleString()}</p>
                        </div>
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button 
                      onClick={() => {
                        const messageTarget = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
                        setSelectedProfileId(null);
                        navigate(messageTarget ? `/circle?tab=messages&user=${messageTarget}` : '/circle?tab=messages');
                      }}
                       className="flex-1 h-14 rounded-2xl bg-surface-muted border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main hover:bg-card-dark transition-all flex items-center justify-center gap-3"
                    >
                       <MessageCircle size={18} /> Send Message
                    </button>
                    {!isOwnProfile && (
                      <button
                        onClick={() => setIsReportOpen(true)}
                        className="h-14 px-5 rounded-2xl bg-danger/10 border border-danger/15 text-danger text-[10px] font-black uppercase tracking-widest hover:bg-danger/15 transition-all flex items-center justify-center gap-3"
                      >
                        <Flag size={16} /> Report
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        const profileTarget = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
                        setSelectedProfileId(null);
                        navigate(profileTarget && profileTarget !== session?.user?.id ? `/profile/${profileTarget}` : '/profile');
                      }}
                      className="px-10 h-14 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                       View Profile
                    </button>
                 </div>
              </div>
            </>
          )}
      </ResponsiveModal>

      <ResponsiveModal
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Report profile"
        subtitle="Reports are private and help keep VisNova safe."
        size="sm"
        zIndexClassName="z-[240]"
      >
        <div className="p-5 space-y-4">
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Reason</span>
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold text-text-main outline-none focus:border-accent"
            >
              {reportReasons.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details optional</span>
            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value.slice(0, 1000))}
              className="w-full min-h-28 rounded-2xl bg-surface-muted border border-card-border px-4 py-3 text-sm font-semibold text-text-main outline-none resize-none focus:border-accent"
              placeholder="Add context for moderators..."
            />
          </label>
          <button
            onClick={submitProfileReport}
            disabled={isReporting}
            className="w-full h-12 rounded-2xl bg-danger text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isReporting && <Loader2 size={16} className="animate-spin" />}
            Submit Report
          </button>
        </div>
      </ResponsiveModal>
    </>
  );
}
