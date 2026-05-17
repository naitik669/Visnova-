import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Flag, Heart, MessageCircle, Plus, UserCheck, Users, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { safeNumber, safeString } from '../../lib/safeData';
import VerifiedBadge from '../VerifiedBadge';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { SelectMenu } from '../ui/SelectMenu';

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

const initialsFor = (name: string) => {
  const parts = safeString(name, 'User').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'U'}${parts[1]?.[0] || ''}`;
};

export default function UserProfileModal() {
  const {
    selectedProfileId,
    setSelectedProfileId,
    user: currentUser,
    session,
    userCircles,
    addToCircle,
    removeFromCircle,
    toggleFollow,
    followingIds,
    fetchProfileStats,
    reportUser
  } = useStore();
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

  const targetProfileId = selectedProfileId === 'me' ? session?.user?.id : selectedProfileId;
  const isOwnProfile = !!targetProfileId && targetProfileId === session?.user?.id;
  const currentCircle = targetProfileId ? userCircles[targetProfileId] : null;
  const isFollowing = !!targetProfileId && followingIds.includes(targetProfileId);

  const displayName = safeString(profile?.display_name || profile?.full_name || currentUser.name, 'Explorer');
  const username = safeString(profile?.username || currentUser.username, 'user');
  const avatar = safeString(profile?.avatar_url || currentUser.avatar);
  const role = safeString(profile?.role || currentUser.role, 'Vision Builder');
  const level = safeNumber(profile?.level || currentUser.level, 1);
  const bio = safeString(profile?.bio || currentUser.bio, 'No bio yet.');

  const refreshStats = async (id: string) => {
    const stats = await fetchProfileStats(id);
    setFollowersCount(stats.followersCount);
    setFollowingCount(stats.followingCount);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetProfileId) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetProfileId)
          .maybeSingle();

        if (error) throw error;
        setProfile(data || {
          id: targetProfileId,
          email: currentUser.email,
          full_name: currentUser.name,
          display_name: currentUser.name,
          username: currentUser.username,
          avatar_url: currentUser.avatar,
          bio: currentUser.bio,
          role: currentUser.role,
          level: currentUser.level,
          streak: currentUser.streak,
          verified: currentUser.verified
        });
        await refreshStats(targetProfileId);
      } catch (error) {
        console.error('Error fetching modal profile:', error);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetProfileId, currentUser, fetchProfileStats]);

  if (!selectedProfileId) return null;

  const handleCircleAdd = async (type: 'friend' | 'close_friend' | 'collaborator') => {
    if (!targetProfileId || isOwnProfile) return;
    await addToCircle(targetProfileId, type);
    setShowCircleMenu(false);
  };

  const handleFollow = async () => {
    if (!targetProfileId || isLoadingFollow) return;
    setIsLoadingFollow(true);
    const nextFollowing = await toggleFollow(targetProfileId);
    if (nextFollowing !== null) await refreshStats(targetProfileId);
    setIsLoadingFollow(false);
  };

  const submitProfileReport = async () => {
    if (!targetProfileId || isOwnProfile || isReporting) return;
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
    <ResponsiveModal
      open={!!selectedProfileId}
      onClose={() => setSelectedProfileId(null)}
      size="lg"
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
          <div className="relative h-28 sm:h-40 bg-accent/20 shrink-0">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center mix-blend-overlay opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-app-container to-transparent" />
            <button
              onClick={() => setSelectedProfileId(null)}
              className="absolute top-4 right-4 w-10 h-10 sm:w-11 sm:h-11 bg-card/95 rounded-xl text-text-secondary flex items-center justify-center hover:text-accent transition-all z-20 border border-card-border shadow-lg"
              aria-label="Close profile modal"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 sm:px-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-8">
            <div className="relative -mt-10 sm:-mt-14 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[1.5rem] p-1.5 bg-app-container shadow-2xl ring-1 ring-card-border shrink-0">
                  {avatar ? (
                    <img src={avatar} alt={displayName} className="w-full h-full rounded-[1.2rem] object-cover border border-card-border bg-card" />
                  ) : (
                    <div className="w-full h-full rounded-[1.2rem] bg-accent/10 text-accent flex items-center justify-center text-2xl font-black uppercase">
                      {initialsFor(displayName)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 sm:pb-2">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight uppercase break-words leading-tight">
                          {displayName}
                        </h2>
                        <VerifiedBadge verified={!!profile?.verified} className="shrink-0" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-black text-accent uppercase tracking-[0.2em]">@{username}</p>
                        <span className="h-5 px-2.5 rounded-full bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary flex items-center">
                          LVL {level}
                        </span>
                        <span className="h-5 px-2.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest flex items-center">
                          {role}
                        </span>
                      </div>
                    </div>

                    {isOwnProfile ? (
                      <button
                        onClick={() => {
                          setSelectedProfileId(null);
                          navigate('/profile?tab=settings');
                        }}
                        className="h-11 px-5 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center gap-2 shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        <Zap size={16} /> Edit Profile
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleFollow}
                          className={cn(
                            'h-11 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2',
                            isFollowing
                              ? 'bg-surface-muted text-text-secondary border border-card-border'
                              : 'bg-accent text-accent-contrast shadow-accent/20 hover:scale-105 active:scale-95'
                          )}
                        >
                          {isLoadingFollow ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isFollowing ? (
                            <><UserCheck size={15} /> Following</>
                          ) : (
                            <><Plus size={15} /> Follow</>
                          )}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowCircleMenu(!showCircleMenu)}
                            className={cn(
                              'h-11 w-11 rounded-2xl flex items-center justify-center transition-all border',
                              currentCircle
                                ? 'bg-warning/10 border-warning/30 text-warning'
                                : 'bg-surface-muted border-card-border text-text-secondary hover:text-text-main'
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
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                                className="visnova-menu fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-56 max-h-[70dvh] overflow-y-auto custom-scrollbar p-1.5 z-[240]"
                              >
                                <div className="px-3 py-2 border-b border-card-border/50 mb-1">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">Circle</p>
                                </div>
                                {(['friend', 'close_friend', 'collaborator'] as const).map(type => (
                                  <button
                                    key={type}
                                    onClick={() => handleCircleAdd(type)}
                                    className={cn('visnova-menu-item capitalize', currentCircle === type && 'visnova-menu-item-active')}
                                  >
                                    {type.replace('_', ' ')}
                                  </button>
                                ))}
                                {currentCircle && (
                                  <button
                                    onClick={() => {
                                      if (targetProfileId) removeFromCircle(targetProfileId);
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
              <div className="sm:col-span-3 p-5 bg-card/70 rounded-2xl border border-card-border/70 min-h-32">
                <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest mb-1">Bio</p>
                <p className="text-[13px] font-medium text-text-main leading-relaxed line-clamp-5">{bio}</p>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <div className="p-4 bg-card/70 rounded-2xl border border-card-border/70 min-h-32 flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                    <Users size={20} />
                  </div>
                  <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest">Followers</p>
                  <p className="text-lg font-black text-text-main tabular-nums">{followersCount.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-card/70 rounded-2xl border border-card-border/70 min-h-32 flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center border border-danger/20">
                    <Heart size={20} />
                  </div>
                  <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-widest">Following</p>
                  <p className="text-lg font-black text-text-main tabular-nums">{followingCount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!isOwnProfile && (
                <>
                  <button
                    onClick={() => {
                      setSelectedProfileId(null);
                      navigate(targetProfileId ? `/circle?tab=messages&user=${targetProfileId}` : '/circle?tab=messages');
                    }}
                    className="h-12 rounded-2xl bg-surface-muted border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main hover:bg-card transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={17} /> Message
                  </button>
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="h-12 rounded-2xl bg-danger/10 border border-danger/20 text-[10px] font-black uppercase tracking-widest text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Flag size={17} /> Report
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedProfileId(null);
                  navigate(targetProfileId && targetProfileId !== session?.user?.id ? `/profile/${targetProfileId}` : '/profile');
                }}
                className={cn(
                  'h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2',
                  isOwnProfile ? 'sm:col-span-3' : ''
                )}
              >
                <ExternalLink size={17} /> View Profile
              </button>
            </div>

            {isReportOpen && (
              <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-danger">Report @{username}</p>
                  <button onClick={() => setIsReportOpen(false)} className="w-8 h-8 rounded-xl bg-card border border-card-border text-text-secondary flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
                <SelectMenu
                  value={reportReason}
                  onChange={setReportReason}
                  options={reportReasons}
                  triggerClassName="h-11 rounded-xl bg-card text-xs"
                />
                <textarea
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  maxLength={1000}
                  placeholder="Optional details for moderation"
                  className="w-full min-h-24 rounded-xl bg-card border border-card-border p-3 text-xs font-medium text-text-main outline-none resize-none focus:border-danger/50"
                />
                <button
                  onClick={submitProfileReport}
                  disabled={isReporting}
                  className="w-full h-11 rounded-xl bg-danger text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {isReporting ? 'Sending...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </ResponsiveModal>
  );
}
