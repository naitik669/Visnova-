import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  UserMinus,
  Trash2,
  Archive,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Post, Achievement, Milestone } from '../../types';
import { supabase } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/supabase';
import { ImageLightbox, PostEditModal, PostReportModal } from '../Feed/CommunityFeed';
import { SharedPostEmbed } from '../Feed/SharedPostEmbed';
import VerifiedBadge from '../VerifiedBadge';
import { notificationService } from '../../services/notificationService';
import { safeArray, safeFormat, safeString, safeTime } from '../../lib/safeData';
import { normalizeVisibility } from '../../lib/appPreferences';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { SelectMenu } from '../ui/SelectMenu';
import { VISNOVA_PROFILE_AVATARS } from '../../lib/avatarLibrary';

type SocialProfile = {
  id: string;
  username?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  verified?: boolean;
};

const profileReportReasons = [
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

export default function ProfilePage() {
  const { user: currentUser, session, posts: allPosts, visions, theme, setTheme, restartTutorial, updateUser, selectedProfileId, setSelectedProfileId, toggleFollow, fetchProfileStats, reportUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { profileId } = useParams<{ profileId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'overview') as 'overview' | 'posts' | 'followers' | 'following' | 'archived' | 'achievements' | 'settings';

  const [profile, setProfile] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<SocialProfile[]>([]);
  const [following, setFollowing] = useState<SocialProfile[]>([]);
  const [isLoadingSocialList, setIsLoadingSocialList] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState({
    name: currentUser.name,
    username: currentUser.username || '',
    bio: currentUser.bio || '',
    role: currentUser.role || '',
    avatar: currentUser.avatar
  });

  const targetId = useMemo(
    () => profileId || ((selectedProfileId === 'me' || !selectedProfileId) ? (session?.user?.id || currentUser.id) : selectedProfileId),
    [profileId, selectedProfileId, session?.user?.id, currentUser.id]
  );
  const isOwnProfile = !!targetId && targetId === session?.user?.id;

  const submitProfileReport = async () => {
    if (!targetId || isReporting) return;
    setIsReporting(true);
    const ok = await reportUser(targetId, reportReason, reportDetails);
    setIsReporting(false);
    if (ok) {
      setIsReportOpen(false);
      setReportReason('spam');
      setReportDetails('');
    }
  };

  const mapProfilePost = (p: any): Post => ({
    id: safeString(p?.id),
    userId: safeString(p?.user_id),
    author: {
      id: safeString(p?.author?.id || p?.user_id),
      name: safeString(p?.author?.display_name || p?.author?.full_name, 'Explorer'),
      avatar: safeString(p?.author?.avatar_url, `https://api.dicebear.com/7.x/shapes/svg?seed=${safeString(p?.user_id, 'user')}`),
      handle: `@${safeString(p?.author?.username, 'user')}`,
      verified: !!p?.author?.verified
    },
    caption: safeString(p?.caption),
    content: safeString(p?.content),
    timestamp: safeFormat(p?.created_at, 'MMM d, yyyy'),
    createdAt: safeTime(p?.created_at),
    likes: p?.likes?.[0]?.count || 0,
    comments: p?.comment_count?.[0]?.count || 0,
    saves: p?.saves?.[0]?.count || 0,
    isLiked: false,
    isSaved: false,
    type: p?.type || 'update',
    visibility: normalizeVisibility(p?.visibility || 'public'),
    archived: !!p?.archived,
    archivedAt: p?.archived_at || null,
    deletedAt: p?.deleted_at || null,
    editedAt: p?.edited_at || null,
    media: safeArray<any>(p?.media).map((m: any) => ({
      id: m.id,
      url: m.media_url,
      type: m.media_type
    })),
    tags: safeArray<any>(p?.post_tags).map((t: any) => t.tag).filter(Boolean),
    mentions: safeArray<any>(p?.mentions).map((m: any) => ({
      userId: m.mentioned_user_id,
      username: m.user?.username || 'user'
    })),
    metadata: p?.metadata,
    stats: p?.stats
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
          verified: currentUser.verified,
          created_at: new Date().toISOString()
        });
      } else {
        setProfile(profileData);
      }

      // Fetch Follow Status
      const stats = await fetchProfileStats(targetId);
      setFollowersCount(stats.followersCount);
      setFollowingCount(stats.followingCount);
      setIsFollowing(stats.isFollowing);

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

      let postsQuery = supabase
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

      if (targetId !== session?.user?.id) {
        postsQuery = postsQuery.eq('visibility', 'public').eq('archived', false).is('deleted_at', null);
      } else {
        postsQuery = postsQuery.is('deleted_at', null);
      }

      const { data: postData, error: postError } = await postsQuery;

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

  useEffect(() => {
    if (!isOwnProfile && activeTab === 'archived') {
      setSearchParams({ tab: 'overview' });
    }
  }, [activeTab, isOwnProfile, setSearchParams]);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const startEditingProfile = () => {
    setEditData({
      name: profile?.display_name || profile?.full_name || currentUser.name,
      username: profile?.username || currentUser.username || '',
      bio: profile?.bio || currentUser.bio || '',
      role: profile?.role || currentUser.role || '',
      avatar: profile?.avatar_url || currentUser.avatar
    });
    setActiveTab('settings');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid') return;
    setIsSavingProfile(true);
    const success = await updateUser(editData);
    setIsSavingProfile(false);
    if (success) {
      setIsEditingProfile(false);
      fetchProfileData();
    }
  };

  const handleAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const { publicUrl } = await uploadAvatar(file, session?.user?.id);
      setEditData(data => ({ ...data, avatar: publicUrl }));
      const success = await updateUser({ avatar: publicUrl });
      if (success) {
        setProfile((current: any) => current ? { ...current, avatar_url: publicUrl } : current);
      }
    } catch (error: any) {
      console.error('Failed to update profile photo:', error);
      useStore.getState().addToast({ type: 'error', title: 'Photo failed', description: error.message || 'Could not update your profile photo.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!targetId) return;
    const nextFollowing = await toggleFollow(targetId);
    if (nextFollowing !== null) {
      setIsFollowing(nextFollowing);
      setFollowersCount(count => Math.max(0, count + (nextFollowing ? 1 : -1)));
      const stats = await fetchProfileStats(targetId);
      setFollowersCount(stats.followersCount);
      setFollowingCount(stats.followingCount);
      setIsFollowing(stats.isFollowing);
    }
  };

  const loadSocialList = async (kind: 'followers' | 'following') => {
    if (!targetId) return;
    setIsLoadingSocialList(true);
    try {
      const { data: followRows, error } = kind === 'followers'
        ? await supabase.from('follows').select('follower_id').eq('following_id', targetId)
        : await supabase.from('follows').select('following_id').eq('follower_id', targetId);

      if (error) throw error;
      const ids = (followRows || [])
        .map((row: any) => kind === 'followers' ? row.follower_id : row.following_id)
        .filter(Boolean);

      if (ids.length === 0) {
        if (kind === 'followers') setFollowers([]);
        else setFollowing([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, bio, verified')
        .in('id', ids);

      if (profilesError) throw profilesError;
      const orderedProfiles = ids
        .map(id => (profiles || []).find((profile: SocialProfile) => profile.id === id))
        .filter(Boolean) as SocialProfile[];

      if (kind === 'followers') setFollowers(orderedProfiles);
      else setFollowing(orderedProfiles);
    } catch (error) {
      console.error(`Failed to load ${kind}:`, error);
    } finally {
      setIsLoadingSocialList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'followers' || activeTab === 'following') {
      loadSocialList(activeTab);
    }
  }, [activeTab, targetId]);

  const removeFollower = async (followerId: string) => {
    if (!session?.user?.id || targetId !== session.user.id) return;
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: followerId, following_id: session.user.id });

    if (error) {
      useStore.getState().addToast({ type: 'error', title: 'Remove failed', description: 'Could not remove this follower.' });
      return;
    }

    setFollowers(current => current.filter(profile => profile.id !== followerId));
    setFollowersCount(count => Math.max(0, count - 1));
    useStore.getState().addToast({ type: 'success', title: 'Follower removed', description: 'They no longer follow you.' });
  };

  const unfollowUser = async (followingId: string) => {
    if (!session?.user?.id || targetId !== session.user.id) return;
    const next = await toggleFollow(followingId);
    if (next === false) {
      setFollowing(current => current.filter(profile => profile.id !== followingId));
      setFollowingCount(count => Math.max(0, count - 1));
    }
  };

  const visibleProfilePosts = profilePosts.filter(post => !post.archived);
  const archivedProfilePosts = profilePosts.filter(post => post.archived);
  const savedPosts = allPosts.filter(p => p.isSaved);

  const stats = [
    { label: 'Level', value: profile?.level || 1, icon: Trophy, color: 'text-warning' },
    { label: 'Posts', value: visibleProfilePosts.length, icon: MessageSquare, color: 'text-success' },
    { label: 'Followers', value: followersCount, icon: Users, color: 'text-accent' },
    { label: 'Following', value: followingCount, icon: Heart, color: 'text-danger' },
    { label: 'Streak', value: profile?.streak || 0, icon: Zap, color: 'text-accent' },
  ];

  useEffect(() => {
    if (!isEditingProfile) return;
    const clean = editData.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 24);
    if (clean !== editData.username) {
      setEditData(data => ({ ...data, username: clean }));
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    if (clean === (profile?.username || currentUser.username)) {
      setUsernameStatus('available');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc('is_username_available', {
        candidate_username: clean,
        current_user_id: session?.user?.id
      });
      if (cancelled) return;
      if (error) {
        console.error('Username availability check failed:', error);
        setUsernameStatus('idle');
        return;
      }
      setUsernameStatus(data ? 'available' : 'taken');
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editData.username, isEditingProfile, profile?.username, currentUser.username, session?.user?.id]);

  const themes = [
    { id: 'light', icon: Sun, label: 'Light', desc: 'High contrast clarity', color: 'bg-card text-text-main' },
    { id: 'dark', icon: Moon, label: 'Dark', desc: 'Optimized for deep work', color: 'bg-[#18191C] text-accent-contrast' },
    { id: 'midnight', icon: Moon, label: 'Midnight', desc: 'Deep navy focus', color: 'bg-[#0f172a] text-[#38bdf8]' },
    { id: 'graphite', icon: Palette, label: 'Graphite', desc: 'Neutral dark workspace', color: 'bg-[#262626] text-[#fafaf9]' },
    { id: 'forest-dark', icon: Sparkles, label: 'Forest', desc: 'Dark green calm', color: 'bg-[#102719] text-[#86efac]' },
    { id: 'plum-dark', icon: Palette, label: 'Plum', desc: 'Soft dark creative mode', color: 'bg-[#2f173d] text-[#f0abfc]' },
    { id: 'green', icon: Sparkles, label: 'Green', desc: 'Organic growth focus', color: 'bg-[#2d4a3e] text-accent-contrast' },
    { id: 'yellow', icon: Zap, label: 'Yellow', desc: 'Optimistic energy', color: 'bg-[#7a6a2a] text-accent-contrast' },
    { id: 'pastel', icon: Palette, label: 'Pastel', desc: 'Creative mood', color: 'bg-[#5D4361] text-[#FFF7F0]' },
    { id: 'sage', icon: Sparkles, label: 'Sage', desc: 'Natural focus', color: 'bg-[#8da482] text-white' },
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
    { id: 'followers', label: 'Followers' },
    { id: 'following', label: 'Following' },
    ...(isOwnProfile ? [{ id: 'archived', label: 'Archived' }] : []),
    { id: 'achievements', label: 'Trophies' }
  ];

  if (isLoading) return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4">
       <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">Loading Profile...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto pb-24 animate-in fade-in duration-700 overflow-x-hidden">
      {/* Profile Header */}
      <div className="relative mb-8">
        <div className="h-40 sm:h-56 rounded-[1.5rem] sm:rounded-[2.5rem] bg-gradient-to-r from-accent/20 via-card-dark to-accent/10 border border-card-border overflow-hidden relative">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-overlay opacity-20" />
           <div className="absolute inset-0 bg-gradient-to-t from-app-container to-transparent" />
        </div>

        <div className="px-3 sm:px-8 relative flex flex-col md:flex-row items-start gap-5 sm:gap-7">
          <div className="relative group -mt-14 sm:-mt-24 shrink-0">
            <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-[1.75rem] sm:rounded-[2.25rem] p-1.5 bg-app-container shadow-2xl relative z-10 transition-transform group-hover:scale-[1.02]">
              <img
                src={profile?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + profile?.id}
                className="w-full h-full rounded-[1.45rem] sm:rounded-[1.95rem] object-cover border-2 border-card-border shadow-inner"
                alt={profile?.full_name}
              />
            </div>
            {profile?.verified && (
              <div className="absolute -bottom-2 -right-2 w-11 h-11 sm:w-12 sm:h-12 bg-card rounded-2xl flex items-center justify-center text-accent shadow-xl border-4 border-app-container z-20">
                 <VerifiedBadge verified={true} className="scale-110 sm:scale-125" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1 sm:pt-5 md:pt-6">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-4 min-w-0">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-main tracking-tight uppercase leading-[0.95] break-words min-w-0">
                    {profile?.display_name || profile?.full_name || 'Explorer'}
                  </h1>
                  <div className="flex items-center gap-2 shrink-0">
                    <VerifiedBadge verified={!!profile?.verified} className="shrink-0" />
                    <span className="text-[10px] sm:text-[11px] bg-accent/10 border border-accent/20 text-accent px-4 py-1.5 rounded-full uppercase tracking-[0.2em] font-black whitespace-nowrap">
                      LVL {profile?.level || 1} {profile?.role || 'Explorer'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                  <p className="text-sm font-bold text-text-secondary opacity-60 tracking-widest uppercase">
                    @{profile?.username || 'user'}
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-card-border" />
                  <div className="flex items-center gap-2">
                     <Users size={14} className="text-text-secondary opacity-40" />
                     <span className="text-xs font-bold text-text-secondary tabular-nums">{followersCount.toLocaleString()} Followers</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-card-border" />
                  <div className="flex items-center gap-2">
                     <Heart size={14} className="text-text-secondary opacity-40" />
                     <span className="text-xs font-bold text-text-secondary tabular-nums">{followingCount.toLocaleString()} Following</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 xl:justify-end shrink-0">
                 {isOwnProfile ? (
                    <button
                      onClick={startEditingProfile}
                      className="h-12 px-5 sm:px-8 rounded-2xl bg-surface-muted border border-card-border text-text-secondary text-[11px] font-black uppercase tracking-widest hover:bg-card-dark hover:text-text-main transition-all flex items-center justify-center gap-3"
                    >
                        <Edit3 size={18} /> Edit Profile
                    </button>
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
                     <button onClick={() => navigate(targetId ? `/circle?tab=messages&user=${targetId}` : '/circle?tab=messages')} className="h-12 w-12 rounded-2xl bg-surface-muted border border-card-border text-text-secondary flex items-center justify-center hover:text-accent transition-all">
                        <MessageCircle size={20} />
                     </button>
                     <button
                       onClick={() => setIsReportOpen(true)}
                       className="h-12 w-12 rounded-2xl bg-danger/10 border border-danger/15 text-danger flex items-center justify-center hover:bg-danger/15 transition-all"
                       aria-label="Report profile"
                     >
                        <Flag size={18} />
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
                      <span>Joined {safeFormat(profile?.created_at, 'MMMM yyyy')}</span>
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
                {visibleProfilePosts.slice(0, 3).map(post => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    onOpenThread={() => navigate(`/post/${post.id}`, { state: { from: `${location.pathname}${location.search}` } })}
                    onDeleted={(postId) => setProfilePosts(prev => prev.filter(p => p.id !== postId))}
                    onUpdated={(postId, updates) => setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p))}
                    onArchived={(postId) => setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, archived: true, archivedAt: new Date().toISOString() } : p))}
                  />
                ))}
                {visibleProfilePosts.length === 0 && (
                   <div className="text-center py-24 opacity-30  text-xs uppercase tracking-[0.4em] font-black bg-card rounded-[2.5rem] border border-dashed border-card-border">
                      No posts yet.
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {visibleProfilePosts.map(post => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  onOpenThread={() => navigate(`/post/${post.id}`, { state: { from: `${location.pathname}${location.search}` } })}
                  onDeleted={(postId) => setProfilePosts(prev => prev.filter(p => p.id !== postId))}
                  onUpdated={(postId, updates) => setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p))}
                  onArchived={(postId) => setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, archived: true, archivedAt: new Date().toISOString() } : p))}
                />
              ))}
              {visibleProfilePosts.length === 0 && (
                 <div className="text-center py-24 opacity-30  text-xs uppercase tracking-[0.4em] font-black">
                    No posts yet.
                 </div>
              )}
            </div>
          )}

          {(activeTab === 'followers' || activeTab === 'following') && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="px-2 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-text-secondary/60">
                  <Users size={16} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    {activeTab === 'followers' ? 'Followers' : 'Following'}
                  </p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                  {(activeTab === 'followers' ? followers.length : following.length).toLocaleString()} people
                </p>
              </div>

              {isLoadingSocialList ? (
                <div className="py-20 flex justify-center">
                  <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                </div>
              ) : (activeTab === 'followers' ? followers : following).length === 0 ? (
                <div className="text-center py-24 opacity-40 text-xs uppercase tracking-[0.4em] font-black border border-dashed border-card-border rounded-[2rem]">
                  {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </div>
              ) : (
                (activeTab === 'followers' ? followers : following).map(profileItem => (
                  <div key={profileItem.id} className="system-card p-5 bg-card border-card-border flex items-center gap-4">
                    <button
                      onClick={() => setSelectedProfileId(profileItem.id)}
                      className="flex items-center gap-4 min-w-0 flex-1 text-left"
                    >
                      <img
                        src={profileItem.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profileItem.id}`}
                        className="w-12 h-12 rounded-2xl object-cover border border-card-border"
                        alt={profileItem.username || 'profile'}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase tracking-tight text-text-main flex items-center gap-2 truncate">
                          {profileItem.display_name || profileItem.full_name || profileItem.username || 'Explorer'}
                          <VerifiedBadge verified={!!profileItem.verified} className="scale-90" />
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent">@{profileItem.username || 'user'}</p>
                      </div>
                    </button>

                    {isOwnProfile && activeTab === 'followers' && (
                      <button
                        onClick={() => removeFollower(profileItem.id)}
                        className="h-10 px-4 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-danger hover:border-danger/30 transition-all flex items-center gap-2"
                      >
                        <UserMinus size={14} /> Remove
                      </button>
                    )}
                    {isOwnProfile && activeTab === 'following' && (
                      <button
                        onClick={() => unfollowUser(profileItem.id)}
                        className="h-10 px-4 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-danger hover:border-danger/30 transition-all flex items-center gap-2"
                      >
                        <UserMinus size={14} /> Unfollow
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'archived' && isOwnProfile && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="px-2 pb-2 flex items-center gap-3 text-text-secondary/50">
                <Archive size={14} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Archived posts</p>
              </div>
              {archivedProfilePosts.map(post => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  onOpenThread={() => navigate(`/post/${post.id}`, { state: { from: `${location.pathname}${location.search}` } })}
                  onDeleted={(postId) => setProfilePosts(prev => prev.filter(p => p.id !== postId))}
                  onUpdated={(postId, updates) => setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p))}
                  onArchived={(postId) => setProfilePosts(prev => prev.map(p => p.id === postId ? { ...p, archived: true, archivedAt: new Date().toISOString() } : p))}
                />
              ))}
              {archivedProfilePosts.length === 0 && (
                 <div className="text-center py-24 opacity-30 text-xs uppercase tracking-[0.4em] font-black">
                    No archived posts
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
                          {safeFormat(ach.achievedAt, 'MMM d, yyyy')}
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
                            <span>Target: {ms.targetDate ? safeFormat(ms.targetDate, 'MMM d, yyyy') : 'N/A'}</span>
                            {ms.completedAt && <span className="text-success flex items-center gap-1"><Check size={10} /> Completed</span>}
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && isOwnProfile && (
            <div className="space-y-12 pb-12">
               {/* Account Settings */}
               <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-text-main mb-2">Profile</h3>
                    <p className="text-sm text-text-secondary">Update your personal information and profile details.</p>
                  </div>
                  <div className="lg:col-span-2 system-card p-4 sm:p-8 lg:p-10 bg-card border-card-border shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />

                    {!isEditingProfile ? (
                      <div className="space-y-8 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                           <div className="relative">
                              <img src={currentUser.avatar} className="w-24 h-24 rounded-3xl object-cover border-4 border-surface-muted shadow-2xl" />
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-accent text-accent-contrast flex items-center justify-center shadow-lg border-2 border-card">
                                 <Camera size={14} />
                              </div>
                           </div>
                           <div>
                             <p className="text-2xl font-black text-text-main tracking-tight uppercase font-display flex items-center gap-2">
                               {currentUser.name}
                               <VerifiedBadge verified={currentUser.verified} />
                             </p>
                             <p className="text-sm font-bold text-accent tracking-widest uppercase mt-1">@{currentUser.username || 'user'}</p>
                           </div>
                        </div>
                        <div className="p-6 bg-surface-muted rounded-2xl border border-card-border/50  opacity-80">
                           <p className="text-sm font-medium text-text-secondary leading-relaxed">"{currentUser.bio || 'Bio not set.'}"</p>
                        </div>
                        <button
                          onClick={startEditingProfile}
                          className="px-10 py-4 bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 shadow-xl shadow-accent/20 transition-all font-display"
                        >
                          Edit Profile
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8 relative z-10">
                         <div className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-3xl bg-surface-muted/50 border border-card-border p-5">
                            <div className="relative">
                              <img
                                src={editData.avatar || currentUser.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser.id || 'visnova'}`}
                                className="w-24 h-24 rounded-3xl object-cover border-4 border-card shadow-xl"
                                alt="Profile preview"
                              />
                              {isUploadingAvatar && (
                                <div className="absolute inset-0 rounded-3xl bg-overlay/50 flex items-center justify-center text-white">
                                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black uppercase tracking-widest text-text-main">Profile Photo</p>
                              <p className="text-xs font-medium text-text-secondary mt-1">Upload a PNG, JPEG, or WebP image up to 5MB.</p>
                              <div className="flex flex-wrap gap-3 mt-4">
                                <button
                                  onClick={() => avatarInputRef.current?.click()}
                                  disabled={isUploadingAvatar}
                                  className="h-11 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Camera size={14} />
                                  {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                                </button>
                                <button
                                  onClick={() => setEditData(data => ({ ...data, avatar: '' }))}
                                  className="h-11 px-5 rounded-2xl bg-card border border-card-border text-text-secondary text-[10px] font-black uppercase tracking-widest hover:text-danger transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="mt-5">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-text-secondary/55">VisNova profile library</p>
                                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                                  {VISNOVA_PROFILE_AVATARS.map(avatarUrl => (
                                    <button
                                      key={avatarUrl}
                                      type="button"
                                      onClick={() => setEditData(data => ({ ...data, avatar: avatarUrl }))}
                                      className={cn(
                                        "aspect-square overflow-hidden rounded-xl border-2 bg-card transition-all hover:scale-105",
                                        editData.avatar === avatarUrl ? "border-accent ring-2 ring-accent/20" : "border-card-border opacity-70 hover:opacity-100"
                                      )}
                                      aria-label="Choose VisNova profile avatar"
                                    >
                                      <img src={avatarUrl} className="h-full w-full object-cover" alt="" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) handleAvatarFile(file);
                                  event.target.value = '';
                                }}
                              />
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
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
                              <p className={cn(
                                "text-[10px] font-bold uppercase tracking-widest ml-2",
                                usernameStatus === 'available' ? 'text-success' :
                                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-danger' :
                                'text-text-secondary/50'
                              )}>
                                {usernameStatus === 'checking' && 'Checking...'}
                                {usernameStatus === 'available' && 'Available'}
                                {usernameStatus === 'taken' && 'Username taken'}
                                {usernameStatus === 'invalid' && 'Use 3-24 lowercase letters, numbers, or underscores.'}
                                {usernameStatus === 'idle' && 'Lowercase letters, numbers, and underscores only.'}
                              </p>
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
                         <div className="sticky bottom-0 bg-card/95 backdrop-blur py-3 flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button
                              onClick={handleSaveProfile}
                              disabled={isSavingProfile || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
                              className="flex-1 h-14 bg-accent text-accent-contrast rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/20 disabled:opacity-50 disabled:grayscale"
                            >
                              {isSavingProfile ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check size={18} />
                              )}
                              {isSavingProfile ? 'Saving...' : 'Update Profile'}
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
      <ResponsiveModal
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Report profile"
        subtitle="Reports are private and help keep VisNova safe."
        size="sm"
      >
        <div className="p-5 space-y-4">
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Reason</span>
            <SelectMenu value={reportReason} onChange={setReportReason} options={profileReportReasons} />
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
    </div>
  );
}

function ProfilePostCard({ post, onOpenThread, onDeleted, onUpdated, onArchived }: { post: Post, onOpenThread: () => void, onDeleted?: (postId: string) => void, onUpdated?: (postId: string, updates: Partial<Post>) => void, onArchived?: (postId: string) => void }) {
  const { deletePost, updatePost, archivePost, restorePost, reportPost, session } = useStore();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const isOwnPost = post.userId === session?.user?.id;
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

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
          {post.archived && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-text-main/5 text-text-secondary text-[8px] font-black uppercase tracking-widest border border-card-border">
              <Archive size={14} /> Archived
            </div>
          )}
          <span className="text-[10px] font-black text-text-secondary/30 uppercase tracking-[0.3em] flex items-center gap-2">
             <Clock size={12} /> {post.timestamp}
          </span>
          {post.editedAt && (
            <span className="text-[10px] font-black text-text-secondary/40 uppercase tracking-[0.3em] flex items-center gap-2">
              Edited {safeFormat(post.editedAt, 'MMM d, h:mm a')}
            </span>
          )}
        </div>
        {(isOwnPost || currentUserId) && (
          <div ref={menuRef} className="relative z-50">
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
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  className="visnova-menu fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-52 max-h-[70dvh] overflow-y-auto custom-scrollbar p-1.5 z-[240]"
                >
                  {isOwnPost ? (
                    <>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsEditOpen(true);
                        }}
                        className="visnova-menu-item"
                      >
                        <Edit3 size={14} /> Edit Post
                      </button>
                      {!post.archived && (
                        <button
                          onClick={async () => {
                            setIsMenuOpen(false);
                            const archived = await archivePost(post.id);
                            if (archived) onArchived?.(post.id);
                          }}
                          className="visnova-menu-item"
                        >
                          <Archive size={14} /> Archive Post
                        </button>
                      )}
                      {post.archived && (
                        <button
                          onClick={async () => {
                            setIsMenuOpen(false);
                            const restored = await restorePost(post.id);
                            if (restored) onUpdated?.(post.id, { archived: false, archivedAt: null });
                          }}
                          className="visnova-menu-item"
                        >
                          <Archive size={14} /> Restore Post
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this post? This will remove it from your profile and feeds.')) return;
                          setIsMenuOpen(false);
                          const deleted = await deletePost(post.id);
                          if (deleted) onDeleted?.(post.id);
                        }}
                        className="visnova-menu-item visnova-menu-item-danger"
                      >
                        <Trash2 size={14} /> Delete Post
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsReportOpen(true);
                      }}
                      className="visnova-menu-item visnova-menu-item-danger"
                    >
                      <Flag size={14} /> Report Post
                    </button>
                  )}
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

        <SharedPostEmbed post={post} />

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {safeArray<string>(post.tags).map(tag => (
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
          <button
            onClick={() => setExpandedImage(post.media?.[0]?.url || null)}
            className="mt-6 rounded-3xl overflow-hidden border border-card-border aspect-video bg-surface-muted relative group/media w-full text-left"
          >
             <img src={post.media[0].url} alt="dispatch media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
             <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/50 text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/media:opacity-100 transition-opacity">Expand</span>
          </button>
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
            } else if (!wasLiked && post.userId !== currentUserId) {
              await notificationService.send({
                userId: post.userId,
                actorId: currentUserId,
                type: 'like',
                postId: post.id,
                message: 'liked your post'
              });
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
            } else if (!wasSaved && post.userId !== currentUserId) {
              await notificationService.send({
                userId: post.userId,
                actorId: currentUserId,
                type: 'save',
                postId: post.id,
                message: 'saved your post'
              });
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
      <AnimatePresence>
        {isEditOpen && (
          <PostEditModal
            post={post}
            onClose={() => setIsEditOpen(false)}
            onSave={async (updates) => {
              const updated = await updatePost(post.id, updates);
              if (updated) onUpdated?.(post.id, { ...updates, editedAt: new Date().toISOString() });
              return updated;
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isReportOpen && (
          <PostReportModal
            onClose={() => setIsReportOpen(false)}
            reason={reportReason}
            setReason={setReportReason}
            details={reportDetails}
            setDetails={setReportDetails}
            onSubmit={async () => {
              const ok = await reportPost(post.id, reportReason, reportDetails);
              if (ok) setIsReportOpen(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {expandedImage && (
          <ImageLightbox
            src={expandedImage}
            alt={`${post.author.name} post image`}
            onClose={() => setExpandedImage(null)}
          />
        )}
      </AnimatePresence>
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
