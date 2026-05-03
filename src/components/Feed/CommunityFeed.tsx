import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  MessageSquare,
  Heart,
  Bookmark,
  Copy,
  TrendingUp,
  Users,
  Compass,
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  X,
  Send,
  Image as ImageIcon,
  Trophy,
  Flag,
  Search,
  AtSign,
  Hash,
  Loader2,
  Trash2,
  UserPlus,
  VolumeX,
  Edit3,
  Archive
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { Post, Comment } from '../../types';
import { uploadMedia, supabase } from '../../lib/supabase';
import VerifiedBadge from '../VerifiedBadge';
import { notificationService } from '../../services/notificationService';
// Removed Firebase auth import

import { TrendingTopicsSection } from './TrendingTopicsSection';
import { SuggestedUsersFeedBlock } from './SuggestedUsersFeedBlock';

const normalizeHashtag = (tag: string) => tag.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
const extractHashtags = (text: string) => {
  const matches = text.match(/(^|\s)#([a-zA-Z0-9_-]+)/g) || [];
  return matches.map(tag => normalizeHashtag(tag.trim()));
};

function DiscoverCommunitiesPreview() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session, addToast } = useStore();
  const currentUserId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;
    const loadCommunities = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('communities')
        .select('*, members:community_members(user_id, role)')
        .order('created_at', { ascending: false })
        .limit(4);

      if (cancelled) return;
      if (error) {
        console.error('Failed to load community preview:', error);
        setCommunities([]);
      } else {
        setCommunities(data || []);
      }
      setIsLoading(false);
    };

    loadCommunities();
    return () => {
      cancelled = true;
    };
  }, []);

  const joinCommunity = async (communityId: string) => {
    if (!currentUserId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to join communities.' });
      return;
    }

    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: currentUserId, role: 'member' });

    if (error && error.code !== '23505') {
      addToast({ type: 'error', title: 'Join failed', description: 'Could not join this community.' });
      return;
    }

    setCommunities(prev => prev.map(community => community.id === communityId ? {
      ...community,
      members: [
        ...(community.members || []).filter((member: any) => member.user_id !== currentUserId),
        { user_id: currentUserId, role: 'member' }
      ]
    } : community));
    addToast({ type: 'success', title: 'Joined community', description: 'Open Community Spaces to start a thread.' });
  };

  return (
    <div className="space-y-6 pt-10 border-t border-card-border/30">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 flex items-center gap-2">
          <Plus size={12} /> Discover Communities
        </h3>
        <Link to="/communities" className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/70 transition-colors">
          Open Spaces
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="system-card p-6 animate-pulse">
              <div className="w-28 h-4 bg-card rounded mb-4" />
              <div className="w-full h-3 bg-card rounded" />
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="system-card p-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">No real communities yet.</p>
          <Link to="/communities" className="inline-flex mt-4 h-10 px-5 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest items-center">
            Create One
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map(community => {
            const joined = community.members?.some((member: any) => member.user_id === currentUserId);
            return (
              <div key={community.id} className="system-card p-6 flex items-center justify-between group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-text-main/5 flex items-center justify-center text-text-secondary shrink-0">
                    <Users size={24} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-text-main truncate">{community.name}</h4>
                    <p className="text-[10px] font-bold text-text-secondary">
                      {community.members?.length || 0} Members / {community.category || 'General'}
                    </p>
                  </div>
                </div>
                {joined ? (
                  <Link to="/communities" className="h-8 px-4 rounded-lg border border-accent/30 text-accent text-[8px] font-black uppercase tracking-widest flex items-center">
                    Open
                  </Link>
                ) : (
                  <button
                    onClick={() => joinCommunity(community.id)}
                    className="h-8 px-4 rounded-lg bg-accent text-accent-contrast text-[8px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CommunityFeed() {
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'saved'>('feed');
  const [feedSubTab, setFeedSubTab] = useState<'recommended' | 'following' | 'latest'>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [hashtagPosts, setHashtagPosts] = useState<Post[]>([]);
  const [isHashtagLoading, setIsHashtagLoading] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedPostForThread, setSelectedPostForThread] = useState<Post | null>(null);
  const { posts, addPost, fetchPosts, user, trackInteraction, followingIds, circle, toggleFollow } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const pendingHashtag = sessionStorage.getItem('visnova-feed-hashtag');
    if (pendingHashtag) {
      sessionStorage.removeItem('visnova-feed-hashtag');
      setActiveTab('explore');
      setSearchQuery(`#${normalizeHashtag(pendingHashtag)}`);
    }

    const handleNavExplore = () => setActiveTab('explore');
    const handleNavHashtag = (event: Event) => {
      const tag = (event as CustomEvent<string>).detail;
      setActiveTab('explore');
      if (tag) setSearchQuery(`#${normalizeHashtag(tag)}`);
    };
    window.addEventListener('nav-explore', handleNavExplore);
    window.addEventListener('nav-hashtag', handleNavHashtag);
    return () => {
      window.removeEventListener('nav-explore', handleNavExplore);
      window.removeEventListener('nav-hashtag', handleNavHashtag);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchPosts(activeTab === 'saved' ? 'saved' : feedSubTab);
      setIsLoading(false);
    };
    if (activeTab === 'feed' || activeTab === 'saved') {
      load();
    }
  }, [activeTab, feedSubTab, fetchPosts]);

  useEffect(() => {
    if (activeTab === 'explore' && !searchQuery.trim().startsWith('#') && searchQuery.trim().length >= 2) {
      const searchUsers = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, level, verified')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .limit(6);
        if (data) setSearchedUsers(data);
      };
      searchUsers();
    } else {
      setSearchedUsers([]);
    }
  }, [searchQuery, activeTab]);

  const mapPostRow = (p: any): Post => ({
    id: p.id,
    userId: p.user_id,
    author: {
      id: p.author?.id || p.user_id,
      name: p.author?.display_name || p.author?.full_name || 'Explorer',
      avatar: p.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.user_id}`,
      handle: `@${p.author?.username || 'user'}`,
      verified: !!p.author?.verified
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
    stats: p.stats,
    metadata: p.metadata
  });

  useEffect(() => {
    const query = searchQuery.trim();
    const tag = query.startsWith('#') ? normalizeHashtag(query) : '';

    if (activeTab !== 'explore' || !tag) {
      setHashtagPosts([]);
      setIsHashtagLoading(false);
      return;
    }

    let cancelled = false;
    const fetchHashtagPosts = async () => {
      setIsHashtagLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes:post_likes(count),
          saves:saved_posts(count),
          comment_count:comments(count),
          media:post_media(*),
          post_tags!inner(*),
          mentions:post_mentions(*, user:profiles(username))
        `)
        .eq('visibility', 'public')
        .ilike('post_tags.tag', tag)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        console.error('Failed to fetch hashtag posts:', error);
        setHashtagPosts([]);
      } else {
        setHashtagPosts((data || []).map(mapPostRow));
      }
      setIsHashtagLoading(false);
    };

    fetchHashtagPosts();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, activeTab]);

  const filteredPosts = posts.filter(post => {
    // Only apply search filter in Explore tab
    if (activeTab !== 'explore') {
       if (activeTab === 'saved') return post.isSaved;
       return true;
    }

    const searchLower = searchQuery.toLowerCase();
    if (!searchLower) return true;

    const isTagSearch = searchLower.startsWith('#');
    const cleanSearch = isTagSearch ? searchLower.slice(1) : searchLower;

    const matchesSearch = post.content.toLowerCase().includes(searchLower) || 
                         post.author.name.toLowerCase().includes(searchLower) ||
                         post.tags?.some(t => t.toLowerCase().includes(cleanSearch)) ||
                         (post.caption?.toLowerCase().includes(searchLower));

    return matchesSearch;
  });

  const visiblePosts = activeTab === 'explore' && searchQuery.trim().startsWith('#') ? hashtagPosts : filteredPosts;

  const handleHashtagClick = (tag: string) => {
    setActiveTab('explore');
    setSearchQuery(`#${normalizeHashtag(tag)}`);
  };

  const switchTab = (tab: 'feed' | 'explore' | 'saved') => {
    setActiveTab(tab);
    setSearchQuery(''); // Clear search on tab switch as requested
  };

  const renderFeedItems = () => {
    const items: React.ReactNode[] = [];
    
    if (visiblePosts.length === 0) {
      const emptyMessages = {
        recommended: searchQuery ? 'No posts matched your query.' : 'No posts yet. Share your first progress update.',
        following: 'You are not following anyone yet. Follow creators to build your feed.',
        latest: 'No public posts yet.'
      };
      
      const currentEmptyMsg = activeTab === 'saved' ? 'No saved posts yet.' : emptyMessages[feedSubTab];

      return (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4 border-2 border-dashed border-card-border rounded-[2.5rem]">
           <div className="w-20 h-20 rounded-[2rem] bg-accent/5 text-accent flex items-center justify-center mb-6">
              <Users size={32} />
           </div>
           <h3 className="text-xl font-black text-text-main uppercase tracking-tight mb-2">No Posts Found</h3>
           <p className="text-text-secondary/60 text-xs font-medium max-w-xs uppercase tracking-widest leading-relaxed">
              {currentEmptyMsg}
           </p>
           {activeTab === 'feed' && !searchQuery && (
             <button 
               onClick={() => setIsComposerOpen(true)}
               className="mt-8 px-8 h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
             >
                Share First Update
             </button>
           )}
        </div>
      );
    }

    visiblePosts.forEach((post, idx) => {
      items.push(
        <PostCard 
          key={`${post.id || 'post'}-${idx}`} 
          post={post} 
          onOpenThread={() => setSelectedPostForThread(post)} 
          onHashtagClick={handleHashtagClick}
        />
      );

      // Inject suggested users after every 5 items
      if (idx > 0 && (idx + 1) % 5 === 0) {
        items.push(<SuggestedUsersFeedBlock key={`suggested-${idx}`} />);
      }
    });

    if (activeTab === 'feed' && visiblePosts.length > 0 && visiblePosts.length < 5) {
      items.push(<SuggestedUsersFeedBlock key="suggested-end" />);
    }

    return items;
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      {/* Feed Navigation - Non-sticky per user request */}
      <div className="bg-app-container/80 backdrop-blur-md pt-2 pb-2 px-4 mb-4 border-b border-card-border/50">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex bg-surface-muted p-1 rounded-xl border border-card-border flex-1 items-center shadow-sm">
              <button
                onClick={() => switchTab('feed')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'feed' ? "bg-card shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                )}
              >
                <Users size={14} /> Feed
              </button>
              <button
                onClick={() => switchTab('explore')}
                className={cn(
                  "flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'explore' ? "bg-card shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                )}
              >
                <Compass size={14} /> Explore
              </button>
              <button
                onClick={() => switchTab('saved')}
                className={cn(
                  "flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'saved' ? "bg-card shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                )}
              >
                <Bookmark size={14} /> Saved
              </button>
            </div>
            
            <button 
              onClick={() => setIsComposerOpen(true)}
              className="h-10 w-10 sm:w-auto sm:px-4 rounded-xl bg-accent text-accent-contrast flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Post</span>
            </button>
            
            <button 
              onClick={() => useStore.getState().setSelectedProfileId('me')}
              className="w-10 h-10 rounded-xl border-2 border-card-border overflow-hidden shrink-0 hidden sm:block"
            >
              <img src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} className="w-full h-full object-cover" alt="My Profile" />
            </button>
          </div>

          {activeTab === 'feed' && (
            <div className="flex gap-6 px-2 overflow-x-auto scrollbar-hide border-t border-card-border/30 pt-3">
              {(['recommended', 'following', 'latest'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFeedSubTab(tab)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-2 border-b-2",
                    feedSubTab === tab ? "text-accent border-accent" : "text-text-secondary/40 border-transparent hover:text-text-secondary"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="border-t border-card-border/30 pt-3">
              <div className="flex items-center bg-surface-muted rounded-xl border border-card-border px-4 gap-3 w-full focus-within:border-accent/40 transition-colors">
                 <Search size={16} className="text-text-secondary/40 shrink-0" />
                 <input
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search posts, creators, hashtags, or topics"
                   className="bg-transparent border-none outline-none text-sm font-semibold text-text-main placeholder:text-text-secondary/30 h-12 w-full"
                 />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4">
        {activeTab !== 'explore' ? (
          <div className="flex flex-col lg:flex-row gap-8 max-w-[1440px] mx-auto">
            <div className="flex-1 max-w-6xl space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={feedSubTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="bg-app-container rounded-[2.5rem] border border-card-border p-10 animate-pulse">
                     <div className="flex gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-card" />
                        <div className="space-y-2 py-1">
                           <div className="w-32 h-4 bg-card rounded" />
                           <div className="w-20 h-2 bg-card rounded" />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div className="w-full h-4 bg-card rounded" />
                        <div className="w-full h-4 bg-card rounded" />
                        <div className="w-2/3 h-4 bg-card rounded" />
                     </div>
                  </div>
                ))
              ) : renderFeedItems()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:block w-80 shrink-0 space-y-6" />
      </div>
    ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
             {searchQuery && searchedUsers.length > 0 && (
               <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 flex items-center gap-2">
                   <Users size={12} /> People
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {searchedUsers.map(u => (
                     <div key={u.id} className="system-card p-4 flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                         <img src={u.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.id}`} className="w-10 h-10 rounded-xl" alt={u.username} />
                         <div>
                            <p className="text-sm font-bold text-text-main flex items-center gap-2">
                              {u.display_name || 'Explorer'}
                              <VerifiedBadge verified={!!u.verified} className="scale-90" />
                            </p>
                            <p className="text-xs font-semibold text-text-secondary/50">@{u.username}</p>
                         </div>
                       </div>
                       <button 
                         onClick={() => useStore.getState().setSelectedProfileId(u.id)}
                         className="h-8 px-4 rounded-lg border border-card-border text-[8px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-all"
                       >
                         View
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Trending Topics - Main Section */}
             <TrendingTopicsSection 
                onTopicClick={handleHashtagClick} 
                className="mb-12"
             />

             {/* Dynamic Feed showing matches */}
             <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60">
                      Discovery Stream
                   </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {isHashtagLoading ? (
                     <div className="col-span-full py-16 flex flex-col items-center justify-center gap-4 border border-card-border rounded-[2rem] bg-card/40">
                       <Loader2 size={24} className="animate-spin text-accent" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Loading hashtag posts...</p>
                     </div>
                   ) : visiblePosts.length === 0 ? (
                     <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 border border-dashed border-card-border rounded-[2rem]">
                       <Hash size={24} className="text-text-secondary/40" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">No posts found for this search.</p>
                     </div>
                   ) : visiblePosts.slice(0, 10).map((post, idx) => (
                     <PostCard
                       key={`explore-${post.id}-${idx}`} 
                        post={post}
                        onOpenThread={() => setSelectedPostForThread(post)}
                        onHashtagClick={handleHashtagClick}
                        onPostDeleted={(postId) => setHashtagPosts(prev => prev.filter(p => p.id !== postId))}
                        onPostArchived={(postId) => setHashtagPosts(prev => prev.filter(p => p.id !== postId))}
                        onPostUpdated={(postId, updates) => setHashtagPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p))}
                        onAuthorMuted={(authorId) => setHashtagPosts(prev => prev.filter(p => p.userId !== authorId))}
                      />
                   ))}
                </div>
             </div>

             <DiscoverCommunitiesPreview />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isComposerOpen && (
          <PostComposer onClose={() => setIsComposerOpen(false)} onPost={async (p) => {
            const success = await addPost(p);
            return success;
          }} />
        )}
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

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;

const extractDominantColors = (file: File, limit = 5): Promise<string[]> => {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve([]);
          return;
        }

        const size = 80;
        const ratio = Math.min(size / image.width, size / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = new Map<string, { count: number, r: number, g: number, b: number }>();

        for (let index = 0; index < pixels.length; index += 16) {
          const alpha = pixels[index + 3];
          if (alpha < 128) continue;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          if (r > 245 && g > 245 && b > 245) continue;
          if (r < 10 && g < 10 && b < 10) continue;

          const bucketKey = `${Math.round(r / 32) * 32}-${Math.round(g / 32) * 32}-${Math.round(b / 32) * 32}`;
          const existing = buckets.get(bucketKey) || { count: 0, r: 0, g: 0, b: 0 };
          existing.count += 1;
          existing.r += r;
          existing.g += g;
          existing.b += b;
          buckets.set(bucketKey, existing);
        }

        const colors = Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map(bucket => rgbToHex(
            Math.round(bucket.r / bucket.count),
            Math.round(bucket.g / bucket.count),
            Math.round(bucket.b / bucket.count)
          ));

        resolve(colors);
      } catch (error) {
        console.warn('Dominant color extraction failed:', error);
        resolve([]);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([]);
    };

    image.src = url;
  });
};

function PostComposer({ onClose, onPost }: { onClose: () => void, onPost: (p: any) => Promise<boolean> }) {
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [type, setType] = useState<Post['type']>('update');
  const [images, setImages] = useState<{ file: File, preview: string, uploading: boolean }[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusLimit = 160;
  
  const [mentions, setMentions] = useState<{ userId: string, username: string }[]>([]);
  const [mentionSearch, setMentionSearch] = useState<{ type: 'caption' | 'content', query: string, cursorPosition: number } | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, session, addToast } = useStore();

  useEffect(() => {
    if (mentionSearch && mentionSearch.query.length >= 1) {
      const search = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .or(`username.ilike.%${mentionSearch.query}%,display_name.ilike.%${mentionSearch.query}%`)
          .limit(5);
        if (data) setSuggestedUsers(data);
      };
      search();
    } else {
      setSuggestedUsers([]);
    }
  }, [mentionSearch?.query]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, type: 'caption' | 'content') => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    
    if (type === 'caption') setCaption(value);
    else setContent(value);

    // Detect @ mention
    const lastAtPos = value.lastIndexOf('@', cursor - 1);
    if (lastAtPos !== -1) {
      const textAfterAt = value.slice(lastAtPos + 1, cursor);
      // Only trigger if it's a word start and no spaces relative to @
      const isStartOfWord = lastAtPos === 0 || /\s/.test(value[lastAtPos - 1]);
      const hasSpaces = /\s/.test(textAfterAt);

      if (isStartOfWord && !hasSpaces) {
        setMentionSearch({ type, query: textAfterAt, cursorPosition: cursor });
        return;
      }
    }
    setMentionSearch(null);
  };

  const selectUser = (selectedUser: any) => {
    if (!mentionSearch) return;

    const { type, query: mentionQuery, cursorPosition } = mentionSearch;
    const text = type === 'caption' ? caption : content;
    const lastAtPos = text.lastIndexOf('@', cursorPosition - 1);
    
    const before = text.slice(0, lastAtPos);
    const after = text.slice(cursorPosition);
    const newText = `${before}@${selectedUser.username} ${after}`;

    if (type === 'caption') setCaption(newText);
    else setContent(newText);

    setMentions(prev => {
      if (prev.some(m => m.userId === selectedUser.id)) return prev;
      return [...prev, { userId: selectedUser.id, username: selectedUser.username }];
    });

    setMentionSearch(null);
    setSuggestedUsers([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (type === 'status' ? !content.trim() : (!caption.trim() && !content.trim() && images.length === 0)) return;
    if (type === 'status' && content.trim().length > statusLimit) {
      addToast({ type: 'error', title: 'Status too long', description: `Status updates are limited to ${statusLimit} characters.` });
      return;
    }
    setIsSubmitting(true);

    try {
      const uploadedMedia = [];
      const imagesToUpload = type === 'status' ? [] : images;
      for (const img of imagesToUpload) {
        const result = await uploadMedia(img.file, 'post-images', session?.user?.id);
        const dominantColors = await extractDominantColors(img.file);
        uploadedMedia.push({
          url: result.publicUrl,
          type: 'image' as const,
          storagePath: result.filePath,
          dominantColors
        });
      }

      const tags = Array.from(new Set([...extractHashtags(content), ...extractHashtags(caption)].filter(Boolean)));
      const finalMentions = mentions.filter(m => 
        content.includes(`@${m.username}`) || caption.includes(`@${m.username}`)
      );

      const success = await onPost({
        content,
        caption: type === 'status' ? '' : caption,
        type,
        media: type === 'status' ? [] : uploadedMedia,
        tags,
        mentions: finalMentions,
        metadata: {
          ...((type === 'achievement' || type === 'milestone') ? { title, date } : {}),
          imageDominantColors: uploadedMedia.map(media => ({
            url: media.url,
            colors: media.dominantColors
          }))
        }
      });

      if (success) {
        onClose();
      }
    } catch (err) {
      console.error('Submission failed:', err);
      addToast({
        type: 'error',
        title: 'Post failed',
        description: err instanceof Error ? err.message : 'Could not finish uploading this post.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-app-container rounded-[2rem] shadow-2xl overflow-hidden border border-card-border p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
               {type === 'achievement' ? <Trophy size={20} /> : type === 'milestone' ? <Flag size={20} /> : type === 'status' ? <MessageSquare size={20} /> : <Zap size={20} />}
            </div>
            <h3 className="text-xl font-bold text-text-main tracking-tight uppercase font-display">New Post</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 hover:text-text-main transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {(['status', 'update', 'sprint', 'insight', 'milestone', 'achievement'] as Post['type'][]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 flex items-center gap-2",
                  type === t 
                    ? "bg-accent border-accent text-accent-contrast shadow-lg shadow-accent/20" 
                    : "bg-surface-muted border-card-border text-text-secondary opacity-60 hover:opacity-100 hover:border-accent/30"
                )}
              >
                {t === 'achievement' && <Trophy size={12} />}
                {t === 'milestone' && <Flag size={12} />}
                {t === 'status' && <MessageSquare size={12} />}
                {t}
              </button>
            ))}
          </div>

          {(type === 'achievement' || type === 'milestone') && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               className="space-y-4 pt-4 border-t border-card-border/50"
             >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary/60 ml-2">Title</label>
                    <input 
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Name this achievement..."
                      className="w-full bg-card border border-card-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary/60 ml-2">Date</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-card border border-card-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-accent transition-all color-scheme-dark"
                    />
                  </div>
                </div>
             </motion.div>
          )}

          <div className="space-y-4 relative">
            {type !== 'status' && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary/60 ml-2">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => handleTextChange(e, 'caption')}
                placeholder="A catchy hook for your update..."
                className="w-full h-20 bg-card border border-card-border rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-accent/30 transition-all resize-none placeholder:text-text-secondary/20"
              />
            </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary/60 ml-2">
                  {type === 'status' ? 'Status Bubble' : 'Detailed Content'}
                </label>
                {type === 'status' && (
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", content.length > statusLimit ? "text-danger" : "text-text-secondary/40")}>
                    {content.length}/{statusLimit}
                  </span>
                )}
              </div>
              <textarea
                value={content}
                onChange={(e) => handleTextChange(e, 'content')}
                maxLength={type === 'status' ? statusLimit : undefined}
                placeholder={type === 'status' ? "What's your current status?" : "Expand on your progress, insights, or plans..."}
                className={cn(
                  "w-full bg-card border border-card-border p-4 text-sm font-medium focus:outline-none focus:border-accent/30 transition-all resize-none placeholder:text-text-secondary/20",
                  type === 'status' ? "h-28 rounded-[2rem] rounded-tl-md text-base font-bold bg-accent/5 border-accent/15" : "h-40 rounded-2xl"
                )}
              />
            </div>

            {/* Mention Suggestions */}
            <AnimatePresence>
              {suggestedUsers.length > 0 && mentionSearch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={cn(
                    "absolute z-[110] w-64 bg-card border border-card-border rounded-2xl shadow-2xl p-2 left-4",
                    mentionSearch.type === 'caption' ? "top-20" : "top-48"
                  )}
                >
                  <div className="p-3 border-b border-card-border mb-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/60">Suggesting Users</p>
                  </div>
                  {suggestedUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-muted transition-all group text-left"
                    >
                      <img src={u.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.id}`} className="w-8 h-8 rounded-lg" alt={u.username} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-text-main leading-tight truncate group-hover:text-accent transition-colors">{u.display_name || 'Explorer'}</p>
                        <p className="text-[9px] text-text-secondary/40 font-black uppercase tracking-widest mt-0.5 truncate">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {type !== 'status' && (
          <div className="space-y-4">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-muted text-text-secondary hover:text-accent border border-card-border transition-all group"
                >
                   <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Add Media</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                />
             </div>

             {images.length > 0 && (
               <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-32 h-32 rounded-2xl overflow-hidden border border-card-border shrink-0">
                       <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                       <button 
                         onClick={() => removeImage(i)}
                         className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-danger text-white flex items-center justify-center shadow-lg"
                       >
                          <X size={14} />
                       </button>
                    </div>
                  ))}
               </div>
             )}
          </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-card-border/50">
            <button
              onClick={onClose}
              className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-surface-muted transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (type === 'status' ? !content.trim() : (!caption.trim() && !content.trim() && images.length === 0)) || (type === 'status' && content.trim().length > statusLimit)}
              className="px-10 py-4 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent-contrast/30 border-t-accent-contrast rounded-full animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={16} /> Post
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function PostEditModal({ post, onClose, onSave }: { post: Post, onClose: () => void, onSave: (updates: Partial<Post>) => Promise<boolean> }) {
  const [caption, setCaption] = useState(post.caption || '');
  const [content, setContent] = useState(post.content || '');
  const [type, setType] = useState<Post['type']>(post.type || 'update');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!caption.trim() && !content.trim()) return;
    setIsSaving(true);
    const tags = Array.from(new Set([...extractHashtags(content), ...extractHashtags(caption)].filter(Boolean)));
    const mentions = (post.mentions || []).filter(mention =>
      content.includes(`@${mention.username}`) || caption.includes(`@${mention.username}`)
    );
    const success = await onSave({
      caption,
      content,
      type,
      tags,
      mentions,
      metadata: post.metadata
    });
    setIsSaving(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-overlay/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-2xl bg-app-container rounded-[2rem] shadow-2xl overflow-hidden border border-card-border p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Edit3 size={18} />
            </div>
            <h3 className="text-lg font-black text-text-main tracking-tight uppercase font-display">Edit Post</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 hover:text-text-main transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {(['status', 'update', 'sprint', 'insight', 'milestone', 'achievement'] as Post['type'][]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                  type === t
                    ? "bg-accent border-accent text-accent-contrast shadow-lg shadow-accent/20"
                    : "bg-surface-muted border-card-border text-text-secondary opacity-60 hover:opacity-100 hover:border-accent/30"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Post caption"
            className="w-full h-24 bg-card border border-card-border rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-accent/30 transition-all resize-none placeholder:text-text-secondary/20"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Post content"
            className="w-full h-44 bg-card border border-card-border rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-accent/30 transition-all resize-none placeholder:text-text-secondary/20"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-card-border/50">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-surface-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (!caption.trim() && !content.trim())}
              className="px-8 py-3 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ImageLightbox({ src, alt, onClose }: { src: string, alt: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 max-w-[92vw] max-h-[88vh]"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all"
        >
          <X size={20} />
        </button>
        <img src={src} alt={alt} className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl" />
      </motion.div>
    </div>
  );
}

function PostCard({ post, onOpenThread, onHashtagClick, onPostDeleted, onPostUpdated, onPostArchived, onAuthorMuted }: { post: Post, onOpenThread: () => void, onHashtagClick?: (tag: string) => void, onPostDeleted?: (postId: string) => void, onPostUpdated?: (postId: string, updates: Partial<Post>) => void, onPostArchived?: (postId: string) => void, onAuthorMuted?: (authorId: string) => void }) {
  const { trackInteraction, session, followingIds, toggleFollow, deletePost, updatePost, archivePost, muteUserPosts, addToast } = useStore();
  const hasTrackedView = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [isSaved, setIsSaved] = useState(!!post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likes);
  const currentUserId = session?.user?.id;
  const isOwnPost = post.userId === currentUserId;
  const isFollowingAuthor = followingIds.includes(post.userId);

  useEffect(() => {
    if (!hasTrackedView.current) {
      trackInteraction(post.id, 'view');
      hasTrackedView.current = true;
    }
  }, [post.id]);

  useEffect(() => {
    setIsLiked(!!post.isLiked);
    setIsSaved(!!post.isSaved);
    setLikeCount(post.likes);
  }, [post.id, post.isLiked, post.isSaved, post.likes]);

  const handleLike = async () => {
    if (!currentUserId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to like posts.' });
      return;
    }
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(count => wasLiked ? Math.max(0, count - 1) : count + 1);

    const { error } = wasLiked
      ? await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: currentUserId })
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId });

    if (error) {
      setIsLiked(wasLiked);
      setLikeCount(count => wasLiked ? count + 1 : Math.max(0, count - 1));
      addToast({ type: 'error', title: 'Like failed', description: 'Could not update this like.' });
      return;
    }

    if (!wasLiked) {
      trackInteraction(post.id, 'like');
      if (post.userId !== currentUserId) {
        await notificationService.send({
          userId: post.userId,
          actorId: currentUserId,
          type: 'like',
          postId: post.id,
          message: 'liked your post'
        });
      }
    }
  };

  const handleSave = async () => {
    if (!currentUserId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to save posts.' });
      return;
    }
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    const { error } = wasSaved
      ? await supabase.from('saved_posts').delete().match({ post_id: post.id, user_id: currentUserId })
      : await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId });

    if (error) {
      setIsSaved(wasSaved);
      addToast({ type: 'error', title: 'Save failed', description: 'Could not update saved posts.' });
      return;
    }

    if (!wasSaved) {
      trackInteraction(post.id, 'save');
      if (post.userId !== currentUserId) {
        await notificationService.send({
          userId: post.userId,
          actorId: currentUserId,
          type: 'save',
          postId: post.id,
          message: 'saved your post'
        });
      }
    }
  };
  
  const renderInteractiveText = (text: string, mentions?: Post['mentions']) => {
    const parts = text.split(/(@\w+|#[a-zA-Z0-9_-]+)/g);
    return parts.map((part, i) => {
      const mention = mentions?.find(m => `@${m.username}`.toLowerCase() === part.toLowerCase());
      if (mention) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              useStore.getState().setSelectedProfileId(mention.userId);
            }}
            className="text-accent hover:underline font-bold transition-all"
          >
            {part}
          </button>
        );
      }
      if (part.startsWith('#') && normalizeHashtag(part)) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(part);
            }}
            className="text-accent hover:underline font-bold transition-all"
          >
            {part}
          </button>
        );
      }
      return part;
    });
  };
  
  return (
    <motion.div
      className="system-card p-6 sm:p-12 bg-card border-card-border hover:border-accent/20 transition-all group w-full relative overflow-visible"
      layout
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-5">
          <div className="relative">
            <img src={post.author.avatar} className="w-12 h-12 rounded-2xl border border-card-border shadow-sm group-hover:scale-110 transition-transform duration-500" alt={post.author.name} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-card" />
          </div>
          <div>
            <h4 className="text-base font-bold text-text-main tracking-tight leading-none mb-1 group-hover:text-accent transition-colors font-display uppercase flex items-center gap-2">
              {post.author.name}
              <VerifiedBadge verified={post.author.verified} />
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-text-secondary/40 tracking-widest uppercase">{post.author.handle}</p>
              <span className="w-1 h-1 rounded-full bg-card-border" />
              <p className="text-[10px] font-black text-text-secondary/40 tracking-widest uppercase">{post.timestamp}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(open => !open);
            }}
            className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 hover:text-text-main transition-all"
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                className="absolute top-full right-0 mt-2 w-48 bg-card border border-card-border rounded-2xl shadow-2xl z-50 p-2"
              >
              {!isOwnPost && (
                <button
                  onClick={async () => {
                    if (!currentUserId) return;
                    setIsMenuOpen(false);

                    const { error } = await supabase.from('reports').insert({
                      reporter_id: currentUserId,
                      target_id: post.id,
                      target_type: 'post',
                      reason: 'User Reported'
                    });

                    if (error) {
                      useStore.getState().addToast({ type: 'error', title: 'Report failed', description: 'Could not send report.' });
                      return;
                    }

                    useStore.getState().addActivity({
                      type: 'social',
                      description: 'Reported post for moderation'
                    });
                    useStore.getState().addToast({ type: 'success', title: 'Post reported', description: 'Thank you for keeping the community safe.' });
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors flex items-center gap-3"
                >
                  <Flag size={14} /> Report Post
                </button>
              )}
              {isOwnPost ? (
                <>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors flex items-center gap-3"
                  >
                    <Edit3 size={14} /> Edit Post
                  </button>
                  {post.visibility !== 'archived' && (
                    <button
                      onClick={async () => {
                        setIsMenuOpen(false);
                        const archived = await archivePost(post.id);
                        if (archived) onPostArchived?.(post.id);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors flex items-center gap-3"
                    >
                      <Archive size={14} /> Archive Post
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this post? This cannot be undone.')) return;
                      setIsMenuOpen(false);
                      const deleted = await deletePost(post.id);
                      if (deleted) onPostDeleted?.(post.id);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors flex items-center gap-3"
                  >
                     <Trash2 size={14} /> Delete Post
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setIsMenuOpen(false);
                      await toggleFollow(post.userId);
                      trackInteraction(post.id, 'follow');
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors flex items-center gap-3"
                  >
                    <UserPlus size={14} /> {isFollowingAuthor ? 'Unfollow User' : 'Follow User'}
                  </button>
                  <button
                    onClick={async () => {
                      setIsMenuOpen(false);
                      const muted = await muteUserPosts(post.userId);
                      if (muted) onAuthorMuted?.(post.userId);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors flex items-center gap-3"
                  >
                    <VolumeX size={14} /> Mute Posts
                  </button>
                </>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8 space-y-6 relative z-10">
        <div className="flex flex-wrap gap-2">
          {post.type === 'achievement' && (
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/10 text-warning text-[9px] font-black uppercase tracking-widest border border-warning/20 self-start">
                <Trophy size={14} /> Achievement Unlocked
              </div>
              {post.metadata?.title && (
                <p className="text-sm font-bold text-warning/80 ml-2 tracking-tight">{post.metadata.title}</p>
              )}
            </div>
          )}
          {post.type === 'milestone' && (
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success text-[9px] font-black uppercase tracking-widest border border-success/20 self-start">
                <Flag size={14} /> Milestone Mastered
              </div>
              {post.metadata?.title && (
                <p className="text-sm font-bold text-success/80 ml-2 tracking-tight">{post.metadata.title}</p>
              )}
            </div>
          )}
          {post.type === 'sprint' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest border border-accent/20">
              <Zap size={14} /> High-Octane Sprint
            </div>
          )}
          {post.type === 'status' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest border border-accent/20">
              <MessageSquare size={14} /> Status
            </div>
          )}
          
          {post.tags?.map(tag => (
            <button
              key={tag}
              onClick={() => onHashtagClick?.(tag)}
              className="px-3 py-1.5 rounded-full bg-surface-muted text-[9px] font-black text-text-secondary/60 uppercase tracking-widest border border-card-border hover:text-accent transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
        
        <div className={cn("space-y-4", post.type === 'status' && "max-w-2xl")}>
          {post.caption && (
            <h5 className="text-xl font-bold text-text-main tracking-tight leading-relaxed font-display">
              {renderInteractiveText(post.caption, post.mentions)}
            </h5>
          )}
          
          <p className={cn(
            "whitespace-pre-wrap",
            post.type === 'status'
              ? "inline-block rounded-[2rem] rounded-tl-md bg-accent/10 border border-accent/15 px-6 py-5 text-base font-bold text-text-main leading-relaxed shadow-sm"
              : "text-sm text-text-secondary leading-relaxed font-medium opacity-80"
          )}>
            {renderInteractiveText(post.content, post.mentions)}
          </p>
        </div>

        {post.media && post.media.length > 0 && (
          <div className={cn(
            "grid gap-4 mt-6",
            post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {post.media.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setExpandedImage(item.url)}
                className="relative rounded-3xl overflow-hidden border border-card-border aspect-[16/10] bg-surface-muted text-left group/media"
              >
                <img src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="post media" />
                <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/50 text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/media:opacity-100 transition-opacity">Expand</span>
              </button>
            ))}
          </div>
        )}

        {post.stats && (
          <div className="p-6 bg-surface-muted/20 rounded-[2rem] border border-card-border/50 flex items-center gap-8 group/stats transition-all">
             {post.stats.focusTime && (
               <div className="flex flex-col gap-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/40">Focus Time</p>
                  <p className="text-base font-bold text-text-main tracking-tight">{post.stats.focusTime} Minutes</p>
               </div>
             )}
             <div className="w-px h-8 bg-card-border/30" />
             <div className="flex items-center gap-3 text-accent/80">
                <div className="w-8 h-8 rounded-full bg-accent/5 flex items-center justify-center">
                   <ArrowUpRight size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Deep Session</span>
             </div>
          </div>
        )}
      </div>

      <div className="mt-10 pt-8 border-t border-card-border/50 flex items-center justify-between relative z-10">
         <div className="flex items-center gap-6 sm:gap-10">
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 text-text-secondary transition-all group/btn",
                isLiked ? "text-danger" : "hover:text-danger hover:scale-110 active:scale-95"
              )}
            >
               <Heart size={20} className={cn("transition-all", isLiked && "fill-danger")} />
               <span className="text-[11px] font-black tabular-nums">{likeCount}</span>
            </button>
            
            <button 
              onClick={() => {
                onOpenThread();
                trackInteraction(post.id, 'comment');
              }}
              className="flex items-center gap-2 text-text-secondary hover:text-accent hover:scale-110 active:scale-95 transition-all group/btn"
            >
               <MessageSquare size={20} />
               <span className="text-[11px] font-black tabular-nums">{post.comments}</span>
            </button>
            
            <button 
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-2 text-text-secondary hover:text-text-main hover:scale-110 active:scale-95 transition-all"
            >
               <Send size={20} />
               <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Send</span>
            </button>
         </div>
         
         <button 
           onClick={() => {
             handleSave();
           }}
           className={cn(
            "transition-all hover:scale-110 active:scale-90",
            isSaved ? "text-accent" : "text-text-secondary hover:text-accent"
          )}
         >
            <Bookmark size={20} className={isSaved ? "fill-accent" : ""} />
         </button>
      </div>
      <AnimatePresence>
        {isShareOpen && (
          <SharePostModal post={post} onClose={() => setIsShareOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isEditOpen && (
          <PostEditModal
            post={post}
            onClose={() => setIsEditOpen(false)}
            onSave={async (updates) => {
              const updated = await updatePost(post.id, updates);
              if (updated) onPostUpdated?.(post.id, updates);
              return updated;
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
    </motion.div>
  );
}

function SharePostModal({ post, onClose }: { post: Post, onClose: () => void }) {
  const { session, followingIds, addToast } = useStore();
  const currentUserId = session?.user?.id;
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const postUrl = `${window.location.origin}/post/${post.id}`;

  useEffect(() => {
    let cancelled = false;
    const loadConnections = async () => {
      if (!currentUserId) {
        setIsLoading(false);
        return;
      }

      const { data: followerRows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUserId);

      const ids = Array.from(new Set([
        ...followingIds,
        ...((followerRows || []).map((row: any) => row.follower_id))
      ])).filter(id => id && id !== currentUserId);

      if (ids.length === 0) {
        if (!cancelled) {
          setConnections([]);
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, verified')
        .in('id', ids)
        .limit(30);

      if (cancelled) return;
      if (error) {
        console.error('Failed to load send connections:', error);
        setConnections([]);
      } else {
        setConnections(data || []);
      }
      setIsLoading(false);
    };

    loadConnections();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, followingIds]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(postUrl);
    addToast({ type: 'success', title: 'Link copied', description: 'Post link copied to clipboard.' });
  };

  const sendPost = async () => {
    if (!currentUserId || selectedUserIds.length === 0) return;
    setIsSending(true);
    try {
      await Promise.all(selectedUserIds.map(async (targetUserId) => {
        const { data: conversationId, error: conversationError } = await supabase.rpc('start_direct_conversation', { other_user_id: targetUserId });
        if (conversationError) throw conversationError;
        const { error: messageError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: currentUserId,
          content: `Sent you a post: ${post.caption || post.content.slice(0, 80) || 'VisNova post'}\n${postUrl}`
        });
        if (messageError) throw messageError;
      }));
      addToast({ type: 'success', title: 'Post sent', description: 'Shared with your selected connections.' });
      onClose();
    } catch (error: any) {
      console.error('Failed to send post:', error);
      addToast({ type: 'error', title: 'Send failed', description: error.message || 'Could not send this post.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/70 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-lg bg-app-container rounded-[2rem] border border-card-border shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-card-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-text-main">Send Post</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50 mt-1">Copy link or send in messages</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary/50 hover:text-text-main flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <button onClick={copyLink} className="w-full h-12 rounded-2xl bg-card border border-card-border flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/30 transition-all">
            <Copy size={16} /> Copy Link
          </button>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Connections</p>
            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {isLoading ? (
                <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
              ) : connections.length === 0 ? (
                <div className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-text-secondary/40 border border-dashed border-card-border rounded-2xl">
                  Follow people or gain followers to send posts in app.
                </div>
              ) : connections.map(connection => {
                const selected = selectedUserIds.includes(connection.id);
                return (
                  <button
                    key={connection.id}
                    onClick={() => setSelectedUserIds(current => selected ? current.filter(id => id !== connection.id) : [...current, connection.id])}
                    className={cn("w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition-all", selected ? "border-accent bg-accent/5" : "border-card-border bg-card hover:border-accent/30")}
                  >
                    <img src={connection.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${connection.id}`} className="w-10 h-10 rounded-xl border border-card-border object-cover" alt={connection.username || 'connection'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase text-text-main truncate flex items-center gap-2">
                        {connection.display_name || connection.full_name || connection.username || 'Explorer'}
                        <VerifiedBadge verified={!!connection.verified} className="scale-75" />
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-accent">@{connection.username || 'user'}</p>
                    </div>
                    <div className={cn("w-5 h-5 rounded-lg border flex items-center justify-center", selected ? "bg-accent border-accent text-accent-contrast" : "border-card-border")} />
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={sendPost} disabled={isSending || selectedUserIds.length === 0} className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send to {selectedUserIds.length || 0}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CommentThreadModal({ post, onClose }: { post: Post, onClose: () => void }) {
  const { addComment, user } = useStore();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const formatted: Comment[] = data.map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        author: {
          name: c.author?.display_name || c.author?.full_name || 'Explorer',
          avatar: c.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${c.user_id}`,
          handle: `@${c.author?.username || 'user'}`,
          verified: !!c.author?.verified
        },
        content: c.content,
        timestamp: new Date(c.created_at).toLocaleDateString()
      }));
      
      setComments(formatted);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const result = await addComment(post.id, commentText);
    if (result) {
      setCommentText('');
      fetchComments();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-overlay/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: 20 }}
        className="relative w-full max-w-2xl bg-app-container rounded-[2rem] shadow-2xl overflow-hidden border border-card-border flex flex-col h-[85vh]"
      >
        <div className="p-6 border-b border-card-border flex justify-between items-center bg-card">
           <h3 className="text-lg font-black uppercase tracking-widest text-text-main">Thread</h3>
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 hover:text-text-main transition-all">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
           {/* Original Post Summary */}
           <div className="bg-surface-muted/30 p-6 rounded-[2rem] border border-card-border/50">
              <div className="flex items-center gap-3 mb-4">
                <img src={post.author.avatar} className="w-10 h-10 rounded-xl" alt="author" />
                <div>
                   <h4 className="text-xs font-bold text-text-main uppercase tracking-widest">{post.author.name}</h4>
                   <p className="text-[10px] font-bold text-text-secondary/40">{post.timestamp}</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed ">"{post.content.slice(0, 150)}..."</p>
           </div>

           <div className="space-y-6">
              <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-text-secondary/40 ml-2">Comments</h4>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                   <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-4 group">
                     <img src={comment.author.avatar} className="w-10 h-10 rounded-xl border border-card-border shrink-0" alt="avatar" />
                     <div className="flex-1">
                        <div className="bg-card p-5 rounded-2xl border border-card-border group-hover:border-accent/10 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                              <h5 className="text-[10px] font-black text-text-main uppercase tracking-widest group-hover:text-accent transition-colors flex items-center gap-2">
                                {comment.author.name}
                                <VerifiedBadge verified={comment.author.verified} className="scale-90" />
                              </h5>
                              <span className="text-[9px] font-black text-text-secondary/30 uppercase">{comment.timestamp}</span>
                           </div>
                           <p className="text-sm text-text-secondary leading-relaxed font-medium">{comment.content}</p>
                        </div>
                        <div className="flex gap-4 mt-2 ml-4">
                           <button className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40 hover:text-accent transition-colors">Reply</button>
                           <button className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40 hover:text-danger transition-colors">Like</button>
                        </div>
                     </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-30">
                   <p className="text-[10px] font-black uppercase tracking-widest">No comments yet.</p>
                </div>
              )}
           </div>
        </div>

        <div className="p-8 border-t border-card-border bg-card">
           <div className="relative">
              <textarea 
                 value={commentText}
                 onChange={e => setCommentText(e.target.value)}
                 placeholder="Write a comment..."
                 className="w-full bg-surface-muted border border-card-border rounded-2xl p-5 pr-16 text-sm font-medium focus:outline-none focus:border-accent transition-all resize-none h-24"
              />
              <button 
                 onClick={handleAddComment}
                 disabled={!commentText.trim()}
                 className="absolute bottom-4 right-4 w-10 h-10 rounded-xl bg-accent text-accent-contrast flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                 <Send size={18} />
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
