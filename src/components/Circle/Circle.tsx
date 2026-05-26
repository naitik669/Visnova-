import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Check, Clock, Globe, Inbox, MessageCircle, Plus, Sparkles, Target, Users } from 'lucide-react';
import VerifiedBadge from '../VerifiedBadge';
import { getSuggestedUsers, SuggestedUser } from '../../services/discoveryService';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';
import MessagesPage from '../Social/MessagesPage';
import { safeFormat, safeString, safeTime } from '../../lib/safeData';
import { normalizeVisibility } from '../../lib/appPreferences';
import CommunitySpaces from '../Community/CommunitySpaces';

const relationLabels: Record<string, string> = {
  following: 'Following',
  follower: 'Follower',
  mutual: 'Mutual',
  friend: 'Friend',
  close_friend: 'Close friend',
  collaborator: 'Collaborator'
};

export default function Circle() {
  const navigate = useNavigate();
  const { circle, user, sharedVisions, acceptVision, fetchCircleData, followingIds, toggleFollow, setSelectedProfileId } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [activity, setActivity] = useState<Post[]>([]);
  const circleIds = useMemo(() => new Set(circle.map(member => member.id)), [circle]);
  const activeTab = searchParams.get('tab') || 'messages';
  const validTab = ['messages', 'connections', 'communities', 'requests', 'activity'].includes(activeTab) ? activeTab : 'messages';

  const changeTab = (tab: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'messages') nextParams.delete('tab');
    else nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    fetchCircleData();
  }, [fetchCircleData]);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!user.id) return;
      const nextSuggestions = await getSuggestedUsers(user.id);
      setSuggestions(nextSuggestions.filter(candidate => !circleIds.has(candidate.id) && !followingIds.includes(candidate.id)));
    };
    loadSuggestions();
  }, [user.id, circleIds, followingIds]);

  useEffect(() => {
    const loadActivity = async () => {
      const ids = Array.from(circleIds);
      if (ids.length === 0) {
        setActivity([]);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*, author:profiles!posts_user_id_fkey(*)')
        .eq('visibility', 'public')
        .eq('archived', false)
        .is('deleted_at', null)
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Failed to load circle activity:', error);
        setActivity([]);
        return;
      }

      setActivity((data || []).map((post: any) => ({
        id: safeString(post?.id),
        userId: safeString(post?.user_id),
        author: {
          id: safeString(post?.author?.id || post?.user_id),
          name: safeString(post?.author?.display_name || post?.author?.full_name, 'Explorer'),
          avatar: post?.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${safeString(post?.user_id, 'user')}`,
          handle: `@${safeString(post?.author?.username, 'user')}`,
          verified: !!post?.author?.verified
        },
        caption: safeString(post?.caption),
        content: safeString(post?.content),
        timestamp: safeFormat(post?.created_at, 'MMM d'),
        createdAt: safeTime(post?.created_at),
        likes: 0,
        comments: 0,
        saves: 0,
        isLiked: false,
        isSaved: false,
        type: post.type || 'update',
        visibility: normalizeVisibility(post.visibility || 'public')
      })));
    };
    loadActivity();
  }, [circleIds]);

  const tabs = [
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'connections', label: 'Connections', icon: Users },
    { id: 'communities', label: 'Communities', icon: Globe },
    { id: 'requests', label: 'Requests', icon: Inbox, badge: sharedVisions.length },
    { id: 'activity', label: 'Activity', icon: Sparkles },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-0 pb-24 pt-1 animate-in fade-in duration-700 sm:space-y-6 sm:px-0 sm:pb-20 sm:pt-2">
      <section className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-sm lg:hidden">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Circle</p>
        <h1 className="mt-1 text-2xl font-black text-text-main">Accountability hub</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">
          Check messages, ask for help, and keep momentum with your people.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/circle/momentum')}
            className="h-12 rounded-2xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
          >
            Momentum
          </button>
          <button
            type="button"
            onClick={() => changeTab('connections')}
            className="h-12 rounded-2xl border border-card-border bg-app-container px-4 text-[10px] font-black uppercase tracking-widest text-text-main"
          >
            Partners
          </button>
        </div>
      </section>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = validTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 transition-all",
                active ? "bg-accent text-accent-contrast border-accent shadow-lg shadow-accent/10" : "bg-card border-card-border text-text-secondary hover:text-text-main"
              )}
            >
              <Icon size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
              {!!tab.badge && (
                <span className={cn("min-w-5 h-5 px-1 rounded-full text-[9px] font-black flex items-center justify-center", active ? "bg-accent-contrast text-accent" : "bg-accent text-accent-contrast")}>
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {validTab === 'connections' && (
        <section className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-1 sm:px-2">
              <Users size={20} className="text-accent" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-main">Connections</h2>
            </div>

            {circle.length === 0 ? (
              <div className="system-card p-12 bg-card border-dashed border-card-border text-center">
                <p className="text-sm font-bold text-text-secondary">Your circle is empty. Follow people to build your circle.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {circle.map((member) => (
                  <div key={member.id} className="system-card flex flex-col gap-4 border-card-border bg-card p-4 transition-all hover:border-accent/30 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6">
                    <button onClick={() => setSelectedProfileId(member.id)} className="flex items-center gap-4 min-w-0 text-left">
                      <img src={member.avatar} alt={member.name} className="h-14 w-14 rounded-2xl border border-card-border object-cover shadow-lg sm:h-16 sm:w-16" />
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-text-main uppercase tracking-tight flex items-center gap-2 truncate">
                          {member.name}
                          <VerifiedBadge verified={member.verified} />
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50 truncate">@{member.username || 'user'}</p>
                        <p className="mt-2 inline-flex px-3 py-1 rounded-lg bg-surface-muted border border-card-border text-[8px] font-black uppercase tracking-widest text-text-secondary">
                          {relationLabels[member.relation || 'following']}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => toggleFollow(member.id)}
                      className={cn(
                        "flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest transition-all sm:h-10 sm:w-auto",
                        followingIds.includes(member.id)
                          ? "bg-surface-muted border border-card-border text-text-secondary"
                          : "bg-accent text-accent-contrast"
                      )}
                    >
                      {followingIds.includes(member.id) ? <Check size={13} /> : <Plus size={13} />}
                      {followingIds.includes(member.id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-main px-2">Suggested Builders</h2>
            {suggestions.length === 0 ? (
              <div className="system-card p-8 bg-card border-card-border text-sm text-text-secondary">No suggestions right now.</div>
            ) : (
              suggestions.slice(0, 5).map((candidate) => (
              <div key={candidate.id} className="system-card flex flex-col gap-4 border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <button onClick={() => setSelectedProfileId(candidate.id)} className="flex items-center gap-4 min-w-0 text-left">
                    <img src={candidate.avatar_url} alt={candidate.display_name} className="w-12 h-12 rounded-xl border border-card-border object-cover" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-black uppercase text-text-main flex items-center gap-2 truncate">
                        {candidate.display_name}
                        <VerifiedBadge verified={candidate.verified} />
                      </h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/50">@{candidate.username}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-accent/80 mt-1">{candidate.reason}</p>
                    </div>
                  </button>
                  <button onClick={() => toggleFollow(candidate.id)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[9px] font-black uppercase tracking-widest text-accent-contrast sm:h-10 sm:w-auto">
                    <Plus size={13} /> Follow
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {validTab === 'messages' && <MessagesPage />}

      {validTab === 'communities' && <CommunitySpaces embedded />}

      {validTab === 'requests' && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Inbox size={20} className="text-accent" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-main">Requests</h2>
          </div>
          {sharedVisions.length === 0 ? (
            <div className="system-card p-12 bg-card border-dashed border-card-border text-center">
              <p className="text-sm font-bold text-text-secondary">No collaboration or message requests right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sharedVisions.map((vision) => (
                <div key={vision.id} className="system-card flex flex-col gap-4 border-accent/20 bg-accent/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-accent-contrast">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-main text-lg tracking-tight">{vision.title}</h3>
                      <p className="text-xs text-text-secondary font-medium opacity-70">{vision.notes}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => acceptVision(vision.id)}
                    className="h-11 rounded-xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
                  >
                    Accept Vision
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {validTab === 'activity' && (
        <section className="space-y-5">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-main px-2">Activity</h2>
          {activity.length === 0 ? (
            <div className="system-card p-8 bg-card border-card-border text-sm text-text-secondary">No recent circle activity.</div>
          ) : (
            activity.map((post) => (
              <button key={post.id} onClick={() => setSelectedProfileId(post.author.id)} className="system-card p-5 bg-card border-card-border w-full text-left hover:border-accent/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-xl border border-card-border" />
                  <div>
                    <p className="text-[11px] font-black uppercase text-text-main flex items-center gap-2">
                      {post.author.name}
                      <VerifiedBadge verified={post.author.verified} className="scale-90" />
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/40 flex items-center gap-1"><Clock size={10} /> {post.timestamp}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-text-secondary line-clamp-2">{post.caption || post.content || 'Posted an update.'}</p>
              </button>
            ))
          )}
        </section>
      )}
    </div>
  );
}
