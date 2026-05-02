import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { 
  Zap, 
  Map, 
  BookOpen, 
  MessageCircle, 
  MessageSquare,
  Settings as SettingsIcon, 
  Edit3, 
  Plus, 
  Clock, 
  TrendingUp, 
  Heart,
  Bookmark,
  Share2,
  Calendar,
  Shield,
  Award,
  Sparkles,
  User as UserIcon,
  Bell,
  Globe,
  Smartphone,
  Key,
  ChevronRight,
  Sun,
  Moon,
  Palette,
  Camera,
  Check,
  X,
  LayoutGrid,
  Trophy,
  Flag,
  Users,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Post, Achievement, Milestone } from '../../types';
import { supabase } from '../../lib/supabase';
import { CommentThreadModal } from '../Feed/CommunityFeed';

export default function ProfilePage() {
  const { user: currentUser, session, posts: allPosts, visions, theme, setTheme, restartTutorial, updateUser, selectedProfileId, setSelectedProfileId, toggleFollow } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'overview') as 'overview' | 'posts' | 'achievements' | 'settings';
  
  const [profile, setProfile] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [selectedPostForThread, setSelectedPostForThread] = useState<Post | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    name: currentUser.name,
    username: currentUser.username || '',
    bio: currentUser.bio || '',
    role: currentUser.role || '',
    avatar: currentUser.avatar
  });

  const targetId = useMemo(
    () => (selectedProfileId === 'me' || !selectedProfileId) ? (session?.user?.id || currentUser.id) : selectedProfileId,
    [selectedProfileId, session?.user?.id, currentUser.id]
  );

  const mapProfilePost = (p: any): Post => ({
    id: p.id,
    userId: p.user_id,
    author: {
      id: p.author?.id || p.user_id,
      name: p.author?.display_name || p.author?.full_name || 'Explorer',
      avatar: p.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.user_id}`,
      handle: `@${p.author?.username || 'user'}`
    },
    caption: p.caption,
    content: p.content || '',
    timestamp: new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    createdAt: new Date(p.created_at).getTime(),
    likes: p.likes?.[0]?.count || 0,
    comments: p.comment_count?.[0]?.count || 0,
    saves: p.saves?.[0]?.count || 0,
    isLiked: false,
    isSaved: false,
    type: p.type || 'update',
    visibility: p.visibility || 'public',
    media: p.media?.map((m: any) => ({
      id: m.id,
      url: m.media_url,
      type: m.media_type
    })) || [],
    tags: p.post_tags?.map((t: any) => t.tag) || [],
    mentions: p.mentions?.map((m: any) => ({
      userId: m.mentioned_user_id,
      username: m.user?.username || 'user'
    })) || [],
    metadata: p.metadata,
    stats: p.stats
  });

  const fetchProfileData = async () => {
    if (!targetId) {
      // If we don't have a target ID yet, check if we're waiting for auth
      if (!session?.user && selectedProfileId === 'me') {
        return;
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      if (!profileData && targetId === session?.user?.id) {
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
          created_at: new Date().toISOString()
        });
      } else {
        setProfile(profileData);
      }

      // Fetch Follow Status
      if (selectedProfileId !== 'me' && session?.user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .match({ follower_id: session.user.id, following_id: targetId })
          .maybeSingle();
        setIsFollowing(!!followData);
      } else {
        setIsFollowing(false);
      }

      // Fetch Achievements
      const { data: achievementData } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', targetId)
        .order('achieved_at', { ascending: false });
      setAchievements(achievementData || []);

      // Fetch Milestones
      const { data: milestoneData } = await supabase
        .from('milestones')
        .select('*')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false });
      setMilestones(milestoneData || []);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes:post_likes(count),
          saves:saved_posts(count),
          comment_count:comments(count),
          media:post_media(*),
          post_tags(*),
          mentions:post_mentions(*, user:profiles(username))
        `)
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (postError) throw postError;

      let myLikes: string[] = [];
      let mySaves: string[] = [];
      const postIds = (postData || []).map((post: any) => post.id);
      if (session?.user?.id && postIds.length > 0) {
        const [likesRes, savesRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
          supabase.from('saved_posts').select('post_id').eq('user_id', session.user.id).in('post_id', postIds)
        ]);
        myLikes = likesRes.data?.map(like => like.post_id) || [];
        mySaves = savesRes.data?.map(save => save.post_id) || [];
      }

      setProfilePosts((postData || []).map((post: any) => ({
        ...mapProfilePost(post),
        isLiked: myLikes.includes(post.id),
        isSaved: mySaves.includes(post.id)
      })));

    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfilePosts(allPosts.filter(p => p.userId === targetId));
      // If profile not found, we shouldn't be stuck forever
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If we're looking at 'me' but auth hasn't loaded yet, wait
    if (selectedProfileId === 'me' && !session?.user) {
      // We'll be re-triggered when session changes if it's part of the dependency or via state
      return;
    }
    fetchProfileData();
  }, [targetId, session?.user?.id]);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSaveProfile = async () => {
    await updateUser(editData);
    setIsEditingProfile(false);
    fetchProfileData();
  };

  const handleToggleFollow = async () => {
    if (!targetId) return;
    await toggleFollow(targetId);
    setIsFollowing(!isFollowing);
  };

  const savedPosts = allPosts.filter(p => p.isSaved);

  const stats = [
    { label: 'Level', value: profile?.level || 1, icon: Trophy, color: 'text-warning' },
    { label: 'Posts', value: profilePosts.length, icon: MessageSquare, color: 'text-success' },
    { label: 'Streak', value: profile?.streak || 0, icon: Zap, color: 'text-accent' },
    { label: 'Achievements', value: achievements.length, icon: Award, color: 'text-danger' },
  ];

  const themes = [
    { id: 'light', icon: Sun, label: 'Light', desc: 'High contrast clarity', color: 'bg-card text-text-main' },
    { id: 'dark', icon: Moon, label: 'Dark', desc: 'Optimized for deep work', color: 'bg-[#18191C] text-accent-contrast' },
    { id: 'green', icon: Sparkles, label: 'Green', desc: 'Organic growth focus', color: 'bg-[#2d4a3e] text-accent-contrast' },
    { id: 'yellow', icon: Zap, label: 'Yellow', desc: 'Optimistic energy', color: 'bg-[#7a6a2a] text-accent-contrast' },
    { id: 'pastel', icon: Palette, label: 'Pastel', desc: 'Creative mood', color: 'bg-[#5D4361] text-[#FFF7F0]' },
  ] as const;

  const settingsSections = [
    { icon: Key, label: 'Security', desc: 'Security and privacy settings' },
    { icon: Bell, label: 'Notifications', desc: 'Alert preferences' },
    { icon: Smartphone, label: 'Devices', desc: 'Connected devices' },
    { icon: Globe, label: 'Localization', desc: 'Regional settings' },
    { icon: Sparkles, label: 'Tutorial', desc: 'Interactive tour', action: 'restart' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'posts', label: 'Posts' },
    { id: 'achievements', label: 'Trophies' }
  ];

  if (isLoading) return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4">
       <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">Loading Profile...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto pb-24 animate-in fade-in duration-700">
      {/* Profile Header */}
      <div className="relative mb-8">
        <div className="h-64 rounded-[2.5rem] bg-gradient-to-r from-accent/20 via-card-dark to-accent/10 border border-card-border overflow-hidden relative">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-overlay opacity-20" />
           <div className="absolute inset-0 bg-gradient-to-t from-app-container to-transparent" />
        </div>

        <div className="px-8 -mt-32 relative flex flex-col md:flex-row items-end gap-6">
          <div className="relative group">
            <div className="w-48 h-48 rounded-[2.5rem] p-1.5 bg-app-container shadow-2xl relative z-10 transition-transform group-hover:scale-[1.02]">
              <img 
                src={profile?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + profile?.id} 
                className="w-full h-full rounded-[2.2rem] object-cover border-2 border-card-border shadow-inner" 
                alt={profile?.full_name} 
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-accent-contrast shadow-xl border-4 border-app-container z-20">
               <Shield size={24} />
            </div>
          </div>

          <div className="flex-1 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-text-main tracking-tight uppercase flex items-center gap-4">
                  {profile?.full_name || profile?.display_name}
                  <span className="text-[11px] bg-accent/10 border border-accent/20 text-accent px-4 py-1.5 rounded-full uppercase tracking-[0.2em] font-black">
                    LVL {profile?.level || 1} {profile?.role || 'Explorer'}
                  </span>
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-sm font-bold text-text-secondary opacity-60 tracking-widest uppercase">
                    @{profile?.username || 'user'}
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-card-border" />
                  <div className="flex items-center gap-2">
                     <Users size={14} className="text-text-secondary opacity-40" />
                     <span className="text-xs font-bold text-text-secondary tabular-nums">42.1k Followers</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 { (selectedProfileId === 'me' || targetId === session?.user?.id) ? (
                   <>
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="h-12 px-8 rounded-2xl bg-surface-muted border border-card-border text-text-secondary text-[11px] font-black uppercase tracking-widest hover:bg-card-dark hover:text-text-main transition-all flex items-center gap-3"
                    >
                        <Edit3 size={18} /> Edit Profile
                    </button>
                    <button 
                        onClick={() => setSelectedProfileId(null)}
                        className="h-12 w-12 rounded-2xl bg-surface-muted border border-card-border text-text-secondary flex items-center justify-center hover:text-danger transition-all"
                      >
                        <X size={18} />
                    </button>
                   </>
                 ) : (
                   <>
                     <button 
                       onClick={handleToggleFollow}
                       className={cn(
                        "h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl",
                        isFollowing 
                          ? "bg-surface-muted border border-card-border text-text-secondary hover:text-danger hover:border-danger/30" 
                          : "bg-accent text-accent-contrast shadow-accent/20 hover:scale-105"
                       )}
                     >
                        {isFollowing ? <Check size={18} /> : <Plus size={18} />}
                        {isFollowing ? 'Following' : 'Follow'}
                     </button>
                     <button onClick={() => navigate(targetId ? `/messages?user=${targetId}` : '/messages')} className="h-12 w-12 rounded-2xl bg-surface-muted border border-card-border text-text-secondary flex items-center justify-center hover:text-accent transition-all">
                        <MessageCircle size={20} />
                     </button>
                   </>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-muted p-1 rounded-3xl border border-card-border w-full shadow-sm mb-8 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 min-w-[100px] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === tab.id ? "bg-card shadow-md text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="px-4"
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Vitals & Bio */}
              <div className="lg:col-span-4 space-y-8">
                <div className="system-card p-8 bg-card-dark/20 border-card-border shadow-sm">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50 mb-6 flex items-center gap-2">
                    <Plus size={12} /> User Vitals
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {stats.map((stat) => (
                      <div key={stat.label} className="p-5 bg-app-container rounded-3xl border border-card-border/50 group hover:border-accent/30 transition-colors">
                        <div className={cn("w-10 h-10 rounded-2xl bg-card border border-card-border flex items-center justify-center mb-4 transition-transform group-hover:scale-110", stat.color)}>
                          <stat.icon size={20} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary opacity-40">{stat.label}</p>
                        <p className="text-xl font-black text-text-main mt-0.5 tracking-tight">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="system-card p-8 bg-card border-card-border">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50 mb-6 flex items-center gap-2">
                    <BookOpen size={12} /> Biography
                  </h3>
                  <p className="text-base font-medium text-text-main leading-relaxed  opacity-80">
                    "{profile?.bio || "This user prefers silence. No biography provided."}"
                  </p>
                  <div className="mt-8 pt-8 border-t border-card-border space-y-6">
                    <div className="flex items-center gap-3 text-[10px] font-black text-text-secondary uppercase tracking-widest">
                      <Calendar size={16} className="text-accent" />
                      <span>Joined {new Date(profile?.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    </div>
                    {profile?.interests && profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest: string) => (
                          <span key={interest} className="px-3 py-1 rounded-full bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary">
                             {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="lg:col-span-8 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50 mb-6 flex items-center gap-2 ml-2">
                  <LayoutGrid size={12} /> Recent Activity
                </h3>
                {profilePosts.slice(0, 3).map(post => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    onOpenThread={() => setSelectedPostForThread(post)}
                    onDeleted={(postId) => setProfilePosts(prev => prev.filter(p => p.id !== postId))}
                  />
                ))}
                {profilePosts.length === 0 && (
                   <div className="text-center py-24 opacity-30  text-xs uppercase tracking-[0.4em] font-black bg-card rounded-[2.5rem] border border-dashed border-card-border">
                      Frequency quiet
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {profilePosts.map(post => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  onOpenThread={() => setSelectedPostForThread(post)}
                  onDeleted={(postId) => setProfilePosts(prev => prev.filter(p => p.id !== postId))}
                />
              ))}
              {profilePosts.length === 0 && (
                 <div className="text-center py-24 opacity-30  text-xs uppercase tracking-[0.4em] font-black">
                    No logged broadcasts
                 </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((ach) => (
                    <div key={ach.id} className="system-card p-8 bg-card border-card-border relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-warning/10 transition-colors" />
                       <div className="w-16 h-16 rounded-[2rem] bg-warning/10 flex items-center justify-center text-warning mb-6 shadow-xl shadow-warning/5 border border-warning/20">
                          <Trophy size={32} />
                       </div>
                       <h4 className="text-lg font-black text-text-main uppercase tracking-tight mb-2 font-display">{ach.title}</h4>
                       <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-70 mb-6">{ach.description}</p>
                       <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/40">
                          <Calendar size={12} />
                          {new Date(ach.achievedAt).toLocaleDateString()}
                       </div>
                    </div>
                  ))}
               </div>
               
               <div className="space-y-6 mt-12">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50 ml-2">Milestone Arc</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {milestones.map((ms) => (
                      <div key={ms.id} className="system-card p-8 bg-card border-card-border group">
                         <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success border border-success/20">
                               <Flag size={20} />
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary opacity-40">Progress</p>
                               <p className="text-xl font-black text-success tabular-nums">{ms.progress}%</p>
                            </div>
                         </div>
                         <h4 className="text-lg font-black text-text-main uppercase tracking-tight mb-2">{ms.title}</h4>
                         <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-70 mb-6">{ms.description}</p>
                         <div className="relative h-2 w-full bg-surface-muted rounded-full overflow-hidden mb-4 border border-card-border/50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${ms.progress}%` }}
                              className="absolute inset-y-0 left-0 bg-success shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                            />
                         </div>
                         <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-text-secondary/40">
                            <span>Target: {ms.targetDate ? new Date(ms.targetDate).toLocaleDateString() : 'N/A'}</span>
                            {ms.completedAt && <span className="text-success flex items-center gap-1"><Check size={10} /> Completed</span>}
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && selectedProfileId === 'me' && (
            <div className="space-y-12 pb-12">
               {/* Account Settings */}
               <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-text-main mb-2">Profile</h3>
                    <p className="text-sm text-text-secondary">Update your personal information and profile details.</p>
                  </div>
                  <div className="lg:col-span-2 system-card p-10 bg-card border-card-border shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
                    
                    {!isEditingProfile ? (
                      <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-8">
                           <div className="relative">
                              <img src={currentUser.avatar} className="w-24 h-24 rounded-3xl object-cover border-4 border-surface-muted shadow-2xl" />
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-accent text-accent-contrast flex items-center justify-center shadow-lg border-2 border-card">
                                 <Camera size={14} />
                              </div>
                           </div>
                           <div>
                             <p className="text-2xl font-black text-text-main tracking-tight uppercase font-display">{currentUser.name}</p>
                             <p className="text-sm font-bold text-accent tracking-widest uppercase mt-1">@{currentUser.username || 'user'}</p>
                           </div>
                        </div>
                        <div className="p-6 bg-surface-muted rounded-2xl border border-card-border/50  opacity-80">
                           <p className="text-sm font-medium text-text-secondary leading-relaxed">"{currentUser.bio || 'Bio not set.'}"</p>
                        </div>
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="px-10 py-4 bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 shadow-xl shadow-accent/20 transition-all font-display"
                        >
                          Edit Profile
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8 relative z-10">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 ml-2">Name</label>
                              <input
                                type="text"
                                value={editData.name}
                                onChange={e => setEditData({...editData, name: e.target.value})}
                                className="w-full h-14 px-6 rounded-2xl bg-surface-muted border border-card-border text-text-main focus:outline-none focus:border-accent font-bold text-sm transition-all"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 ml-2">Username</label>
                              <input
                                type="text"
                                value={editData.username}
                                onChange={e => setEditData({...editData, username: e.target.value})}
                                className="w-full h-14 px-6 rounded-2xl bg-surface-muted border border-card-border text-text-main focus:outline-none focus:border-accent font-bold text-sm transition-all"
                              />
                            </div>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 ml-2">Bio</label>
                            <textarea
                              value={editData.bio}
                              onChange={e => setEditData({...editData, bio: e.target.value})}
                              className="w-full h-32 p-6 rounded-2xl bg-surface-muted border border-card-border text-text-main focus:outline-none focus:border-accent font-medium text-sm resize-none transition-all"
                            />
                         </div>
                         <div className="flex gap-4">
                            <button onClick={handleSaveProfile} className="flex-1 h-14 bg-accent text-accent-contrast rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/20">
                              <Check size={18} /> Update Profile
                            </button>
                            <button onClick={() => setIsEditingProfile(false)} className="px-10 h-14 bg-surface-muted rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-card-border flex items-center justify-center gap-3 hover:bg-card-dark transition-all">
                              <X size={18} /> Cancel
                            </button>
                         </div>
                      </div>
                    )}
                  </div>
               </section>

               {/* Appearance */}
               <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-text-main mb-2">Atmosphere</h3>
                    <p className="text-sm text-text-secondary">Calibrate the visual aesthetics for peak output and mental focus.</p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "p-8 rounded-[2.5rem] border-2 transition-all text-left relative overflow-hidden group",
                          theme === t.id ? "border-accent bg-accent/5 ring-4 ring-accent/5" : "border-card-border bg-card hover:border-accent/30"
                        )}
                      >
                         <div className="flex items-center justify-between mb-6">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform", t.color)}>
                               <t.icon size={24} />
                            </div>
                            {theme === t.id && (
                              <motion.div 
                                layoutId="active-theme" 
                                className="px-4 py-1.5 bg-accent text-accent-contrast rounded-full text-[9px] font-black uppercase tracking-widest"
                              >
                                Active
                              </motion.div>
                            )}
                         </div>
                         <h4 className="text-xs font-black uppercase tracking-[0.3em] font-display">{t.label}</h4>
                         <p className="text-xs text-text-secondary mt-2 font-medium leading-relaxed opacity-70">{t.desc}</p>
                      </button>
                    ))}
                  </div>
               </section>

               {/* Preferences */}
               <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-text-main mb-2">Preferences</h3>
                    <p className="text-sm text-text-secondary">Fine-tune system alerts and sync options for optimal flow.</p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                    {settingsSections.map(item => (
                      <button 
                        key={item.label}
                        onClick={() => { if (item.action === 'restart') restartTutorial(); }}
                        className="group p-6 rounded-3xl bg-card border border-card-border flex items-center justify-between hover:border-accent/20 hover:bg-surface-muted transition-all hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-8 text-left">
                           <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-text-secondary group-hover:text-accent transition-all border border-card-border/50 group-hover:shadow-lg">
                             <item.icon size={24} />
                           </div>
                           <div>
                              <p className="text-sm font-black uppercase tracking-widest text-text-main group-hover:text-accent transition-colors">{item.label}</p>
                              <p className="text-xs text-text-secondary font-medium mt-1">{item.desc}</p>
                           </div>
                        </div>
                        <ChevronRight size={20} className="text-text-secondary group-hover:text-accent transition-all transform group-hover:translate-x-2" />
                      </button>
                    ))}
                  </div>
               </section>

               {/* Danger Zone */}
               <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-card-border">
                  <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-danger mb-2">Danger Zone</h3>
                    <p className="text-sm text-text-secondary">Irreversible account actions. Proceed with caution.</p>
                  </div>
                  <div className="lg:col-span-2 flex flex-wrap gap-4">
                    <button className="h-14 px-10 bg-danger/5 border border-danger/20 text-danger rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-danger/10 transition-all font-display">
                       Reset Data
                    </button>
                    <button className="h-14 px-10 bg-danger text-accent-contrast rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-danger/20 font-display">
                       Delete Account
                    </button>
                  </div>
               </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {selectedPostForThread && (
          <CommentThreadModal
            post={selectedPostForThread}
            onClose={() => setSelectedPostForThread(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfilePostCard({ post, onOpenThread, onDeleted }: { post: Post, onOpenThread: () => void, onDeleted?: (postId: string) => void }) {
  const { deletePost, session } = useStore();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOwnPost = post.userId === session?.user?.id;
  const currentUserId = session?.user?.id;

  const handleHashtagClick = (tag: string) => {
    sessionStorage.setItem('visnova-feed-hashtag', tag);
    navigate('/feed');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('nav-hashtag', { detail: tag }));
    }, 0);
  };

  const renderInteractiveText = (text: string, mentions?: Post['mentions']) => {
    const parts = text.split(/(@\w+|#[a-zA-Z0-9_-]+)/g);
    return parts.map((part, index) => {
      const mention = mentions?.find(m => `@${m.username}`.toLowerCase() === part.toLowerCase());
      if (mention) {
        return (
          <button
            key={`${part}-${index}`}
            onClick={() => useStore.getState().setSelectedProfileId(mention.userId)}
            className="text-accent hover:underline font-bold"
          >
            {part}
          </button>
        );
      }
      if (part.startsWith('#')) {
        const tag = part.replace(/^#/, '').trim();
        if (tag) {
          return (
            <button
              key={`${part}-${index}`}
              onClick={() => handleHashtagClick(tag)}
              className="text-accent hover:underline font-bold"
            >
              {part}
            </button>
          );
        }
      }
      return part;
    });
  };
  
  return (
    <div className="system-card p-6 sm:p-10 bg-card border-card-border group relative overflow-hidden transition-all hover:border-accent/20">
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-wrap gap-3">
          {post.type === 'sprint' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/5 text-accent text-[8px] font-black uppercase tracking-widest border border-accent/10">
              <Zap size={14} /> Sprint Logged
            </div>
          )}
          {post.type === 'milestone' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/5 text-success text-[8px] font-black uppercase tracking-widest border border-success/10">
              <TrendingUp size={14} /> Milestone Reached
            </div>
          )}
          {post.type === 'achievement' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/5 text-warning text-[8px] font-black uppercase tracking-widest border border-warning/10">
              <Trophy size={14} /> Achievement Post
            </div>
          )}
          <span className="text-[10px] font-black text-text-secondary/30 uppercase tracking-[0.3em] flex items-center gap-2">
             <Clock size={12} /> {post.timestamp}
          </span>
        </div>
        {isOwnPost && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(open => !open)}
              className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 hover:text-text-main transition-all shrink-0"
            >
              <MoreHorizontal size={18} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  className="absolute top-full right-0 mt-2 w-44 bg-card border border-card-border rounded-2xl shadow-2xl z-50 p-2"
                >
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this post? This cannot be undone.')) return;
                      setIsMenuOpen(false);
                      const deleted = await deletePost(post.id);
                      if (deleted) onDeleted?.(post.id);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors flex items-center gap-3"
                  >
                    <Trash2 size={14} /> Delete Post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-6 relative z-10 space-y-4">
        {post.caption && (
          <h5 className="text-lg font-black text-text-main tracking-tight uppercase font-display leading-tight">{renderInteractiveText(post.caption, post.mentions)}</h5>
        )}
        <p className="text-sm text-text-secondary leading-relaxed font-semibold opacity-80">
          {renderInteractiveText(post.content, post.mentions)}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <button
                key={tag}
                onClick={() => handleHashtagClick(tag)}
                className="px-3 py-1.5 rounded-full bg-surface-muted text-[9px] font-black text-text-secondary/60 uppercase tracking-widest border border-card-border hover:text-accent transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {post.stats && (
          <div className="mt-6 p-6 bg-surface-muted/30 rounded-[2rem] border border-card-border flex items-center gap-8 group/stat transition-all hover:bg-surface-muted">
             <div className="flex flex-col gap-1">
                <p className="text-[8px] font-black uppercase text-text-secondary/40 tracking-widest">Focus Session</p>
                <p className="text-sm font-black text-text-main tracking-tight tabular-nums">{post.stats.focusTime} Minutes Logged</p>
             </div>
             <div className="w-px h-10 bg-card-border/50" />
             <div className="flex items-center gap-3 text-accent group-hover/stat:scale-105 transition-transform">
                <Award size={18} className="drop-shadow-[0_0_5px_rgba(var(--accent-rgb),0.3)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Verified Session</span>
             </div>
          </div>
        )}
        
        {post.media && post.media.length > 0 && (
          <div className="mt-6 rounded-3xl overflow-hidden border border-card-border aspect-video bg-surface-muted">
             <img src={post.media[0].url} alt="dispatch media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
        )}
      </div>

      <div className="mt-10 pt-8 border-t border-card-border/50 flex items-center gap-10 relative z-10">
        <button 
          onClick={async () => {
            if (!currentUserId) return;
            const wasLiked = isLiked;
            setIsLiked(!wasLiked);
            setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

            const { error } = wasLiked
              ? await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: currentUserId })
              : await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId });

            if (error) {
              setIsLiked(wasLiked);
              setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
              useStore.getState().addToast({ type: 'error', title: 'Like failed', description: 'Could not update this like.' });
            }
          }}
          className={cn(
            "flex items-center gap-2 text-text-secondary transition-all group/btn",
            isLiked ? "text-danger" : "hover:text-danger hover:scale-110 active:scale-95"
          )}
        >
          <Heart size={20} className={cn("transition-all", isLiked && "fill-danger")} />
          <span className="text-[11px] font-black tabular-nums">{likeCount}</span>
        </button>

        <button
          onClick={onOpenThread}
          className="flex items-center gap-2 text-text-secondary hover:text-accent hover:scale-110 active:scale-95 transition-all group/btn"
        >
          <MessageSquare size={20} />
          <span className="text-[11px] font-black tabular-nums">{post.comments}</span>
        </button>

        <button
          onClick={() => {
            const url = `${window.location.origin}/post/${post.id}`;
            navigator.clipboard.writeText(url);
            useStore.getState().addToast({ type: 'info', title: 'Link copied', description: 'Post reference saved to clipboard.' });
          }}
          className="flex items-center gap-2 text-text-secondary hover:text-text-main hover:scale-110 active:scale-95 transition-all"
        >
          <Share2 size={20} />
        </button>

        <button
          onClick={async () => {
            if (!currentUserId) return;
            const wasSaved = isSaved;
            setIsSaved(!wasSaved);

            const { error } = wasSaved
              ? await supabase.from('saved_posts').delete().match({ post_id: post.id, user_id: currentUserId })
              : await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId });

            if (error) {
              setIsSaved(wasSaved);
              useStore.getState().addToast({ type: 'error', title: 'Save failed', description: 'Could not update saved posts.' });
            }
          }}
          className={cn(
            "ml-auto transition-all hover:scale-110 active:scale-90",
            isSaved ? "text-accent" : "text-text-secondary hover:text-accent"
          )}
        >
          <Bookmark size={20} className={isSaved ? "fill-accent" : ""} />
        </button>
      </div>
    </div>
  );
}

function MoreHorizontal({ size }: { size: number }) {
  return (
    <div className="flex gap-0.5">
       <div className="w-1.5 h-1.5 bg-current rounded-full" />
       <div className="w-1.5 h-1.5 bg-current rounded-full opacity-50" />
       <div className="w-1.5 h-1.5 bg-current rounded-full opacity-20" />
    </div>
  );
}
