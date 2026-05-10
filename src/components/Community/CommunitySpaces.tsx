import { useEffect, useMemo, useState } from 'react';
import { Award, Compass, Hash, Loader2, MessageCircle, Plus, Search, Send, Sparkles, Target, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { safeFormat } from '../../lib/safeData';

type Community = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  created_at: string;
  members?: { user_id: string; role: string }[];
  owner?: { display_name?: string; full_name?: string; username?: string; avatar_url?: string };
};

type CommunityThread = {
  id: string;
  community_id: string;
  user_id: string;
  title: string;
  kind: 'discussion' | 'achievement' | 'question';
  created_at: string;
  author?: { display_name?: string; full_name?: string; username?: string; avatar_url?: string };
};

type ThreadMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  metadata?: any;
  created_at: string;
  author?: { display_name?: string; full_name?: string; username?: string; avatar_url?: string };
};

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42);

const kindStyles = {
  discussion: { label: 'Discussion', icon: MessageCircle, className: 'bg-accent/10 text-accent border-accent/20' },
  achievement: { label: 'Achievement', icon: Award, className: 'bg-warning/10 text-warning border-warning/20' },
  question: { label: 'Question', icon: Hash, className: 'bg-success/10 text-success border-success/20' }
};

export default function CommunitySpaces() {
  const { session, user, addToast, addXp } = useStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: '', description: '', category: 'builders' });
  const [newThread, setNewThread] = useState({ title: '', content: '', kind: 'discussion' as CommunityThread['kind'] });
  const [reply, setReply] = useState('');
  const [communityMode, setCommunityMode] = useState<'mine' | 'explore'>('mine');
  const [communitySearch, setCommunitySearch] = useState('');

  const currentUserId = session?.user?.id;
  const canCreateCommunity = (user?.level || 1) >= 5;
  const selectedCommunity = communities.find(community => community.id === selectedCommunityId) || null;
  const selectedThread = threads.find(thread => thread.id === selectedThreadId) || null;
  const isMember = !!selectedCommunity?.members?.some(member => member.user_id === currentUserId);

  const loadCommunities = async () => {
    setIsLoadingCommunities(true);
    const { data, error } = await supabase
      .from('communities')
      .select(`
        *,
        owner:profiles!communities_owner_id_fkey(display_name, full_name, username, avatar_url),
        members:community_members(user_id, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load communities:', error);
      addToast({ type: 'error', title: 'Communities unavailable', description: 'Could not load community spaces.' });
      setIsLoadingCommunities(false);
      return;
    }

    const rows = (data || []) as Community[];
    const hasJoinedCommunity = rows.some(community => community.members?.some(member => member.user_id === currentUserId));
    setCommunities(rows);
    if (rows.length > 0 && !hasJoinedCommunity) setCommunityMode('explore');
    setSelectedCommunityId(current => current || rows[0]?.id || null);
    setIsLoadingCommunities(false);
  };

  const loadThreads = async (communityId: string) => {
    setIsLoadingThreads(true);
    const { data, error } = await supabase
      .from('community_threads')
      .select(`
        *,
        author:profiles!community_threads_user_id_fkey(display_name, full_name, username, avatar_url)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load community threads:', error);
      setThreads([]);
      setSelectedThreadId(null);
      setIsLoadingThreads(false);
      return;
    }

    const rows = (data || []) as CommunityThread[];
    setThreads(rows);
    setSelectedThreadId(current => rows.some(thread => thread.id === current) ? current : rows[0]?.id || null);
    setIsLoadingThreads(false);
  };

  const loadMessages = async (threadId: string) => {
    const { data, error } = await supabase
      .from('community_thread_messages')
      .select(`
        *,
        author:profiles!community_thread_messages_user_id_fkey(display_name, full_name, username, avatar_url)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load thread messages:', error);
      setMessages([]);
      return;
    }

    setMessages((data || []) as ThreadMessage[]);
  };

  useEffect(() => {
    loadCommunities();
  }, []);

  useEffect(() => {
    if (selectedCommunityId && isMember) {
      loadThreads(selectedCommunityId);
    } else {
      setThreads([]);
      setSelectedThreadId(null);
      setMessages([]);
    }
  }, [selectedCommunityId, isMember]);

  useEffect(() => {
    if (selectedThreadId) loadMessages(selectedThreadId);
    else setMessages([]);
  }, [selectedThreadId]);

  const createCommunity = async () => {
    if (!currentUserId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in before creating a community.' });
      return;
    }
    if (!canCreateCommunity) {
      addToast({ type: 'info', title: 'Level 5 required', description: 'Reach level 5 to create your own community space.' });
      return;
    }
    if (!newCommunity.name.trim()) return;

    const slug = `${makeSlug(newCommunity.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from('communities')
      .insert({
        owner_id: currentUserId,
        name: newCommunity.name.trim(),
        slug,
        description: newCommunity.description.trim(),
        category: newCommunity.category.trim() || 'builders'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create community:', error);
      addToast({ type: 'error', title: 'Community not created', description: error.message });
      return;
    }

    await supabase.from('community_members').insert({ community_id: data.id, user_id: currentUserId, role: 'owner' });
    addXp(75);
    setNewCommunity({ name: '', description: '', category: 'builders' });
    setIsCreateOpen(false);
    await loadCommunities();
    setSelectedCommunityId(data.id);
    addToast({ type: 'success', title: 'Community created', description: 'Your space is ready for threads and wins.' });
  };

  const joinCommunity = async (communityId: string) => {
    if (!currentUserId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to join communities.' });
      return;
    }

    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: currentUserId, role: 'member' });

    if (error && error.code !== '23505') {
      console.error('Failed to join community:', error);
      addToast({ type: 'error', title: 'Join failed', description: 'Could not join this community.' });
      return;
    }

    addXp(20);
    await loadCommunities();
    setSelectedCommunityId(communityId);
    addToast({ type: 'success', title: 'Joined community', description: 'You can now open threads and talk.' });
  };

  const createThread = async () => {
    if (!currentUserId || !selectedCommunity || !isMember || !newThread.title.trim()) return;

    const { data, error } = await supabase
      .from('community_threads')
      .insert({
        community_id: selectedCommunity.id,
        user_id: currentUserId,
        title: newThread.title.trim(),
        kind: newThread.kind
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      console.error('Failed to create thread:', error);
      addToast({ type: 'error', title: 'Thread failed', description: 'Could not create this thread.' });
      return;
    }

    if (newThread.content.trim()) {
      await supabase.from('community_thread_messages').insert({
        thread_id: data.id,
        user_id: currentUserId,
        content: newThread.content.trim(),
        metadata: { kind: newThread.kind }
      });
    }

    addXp(newThread.kind === 'achievement' ? 45 : 25);
    setNewThread({ title: '', content: '', kind: 'discussion' });
    await loadThreads(selectedCommunity.id);
    setSelectedThreadId(data.id);
  };

  const sendReply = async () => {
    if (!currentUserId || !selectedThread || !reply.trim()) return;

    const { error } = await supabase.from('community_thread_messages').insert({
      thread_id: selectedThread.id,
      user_id: currentUserId,
      content: reply.trim(),
      metadata: { kind: selectedThread.kind }
    });

    if (error) {
      console.error('Failed to send reply:', error);
      addToast({ type: 'error', title: 'Message failed', description: 'Could not send this reply.' });
      return;
    }

    setReply('');
    addXp(10);
    await loadMessages(selectedThread.id);
  };

  const sortedCommunities = useMemo(() => {
    const query = communitySearch.trim().toLowerCase();

    return communities
      .filter(community => {
        const joined = community.members?.some(member => member.user_id === currentUserId);
        if (communityMode === 'mine' && !joined) return false;
        if (!query) return true;

        return [community.name, community.description, community.category, community.slug]
          .filter(Boolean)
          .some(value => value.toLowerCase().includes(query));
      })
      .slice()
      .sort((a, b) => {
        const aJoined = a.members?.some(member => member.user_id === currentUserId) ? 1 : 0;
        const bJoined = b.members?.some(member => member.user_id === currentUserId) ? 1 : 0;
        return bJoined - aJoined || (b.members?.length || 0) - (a.members?.length || 0);
      });
  }, [communities, currentUserId, communityMode, communitySearch]);

  return (
    <div className="w-full max-w-[1800px] mx-auto pb-20 animate-in fade-in duration-700 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent mb-3">Community Spaces</p>
          <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight font-display uppercase">Find your build crew</h1>
          <p className="text-sm text-text-secondary/70 mt-3 max-w-2xl font-medium">
            Join focused spaces, open threads, ask questions, and share achievements with people working toward similar goals.
          </p>
        </div>
        <button
          onClick={() => canCreateCommunity ? setIsCreateOpen(true) : addToast({ type: 'info', title: 'Level 5 required', description: 'Community creation unlocks at level 5.' })}
          className={cn(
            'h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg transition-all',
            canCreateCommunity ? 'bg-accent text-accent-contrast shadow-accent/20 hover:scale-105 active:scale-95' : 'bg-surface-muted text-text-secondary border border-card-border'
          )}
        >
          <Plus size={16} /> Create Space
        </button>
      </div>

      {!canCreateCommunity && (
        <div className="system-card p-4 border-accent/20 bg-accent/[0.03] flex items-center gap-3">
          <Sparkles size={18} className="text-accent" />
          <p className="text-xs font-bold text-text-secondary">
            You are level {user?.level || 1}. Creation unlocks at level 5, but you can join and participate right now.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <aside className="space-y-3 xl:sticky xl:top-0 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto custom-scrollbar pr-1">
          <div className="bg-card border border-card-border rounded-2xl p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCommunityMode('mine')}
                className={cn(
                  'h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                  communityMode === 'mine' ? 'bg-accent text-accent-contrast' : 'bg-surface-muted text-text-secondary/60 hover:text-text-main'
                )}
              >
                <Users size={13} /> My Spaces
              </button>
              <button
                onClick={() => setCommunityMode('explore')}
                className={cn(
                  'h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                  communityMode === 'explore' ? 'bg-accent text-accent-contrast' : 'bg-surface-muted text-text-secondary/60 hover:text-text-main'
                )}
              >
                <Compass size={13} /> Explore
              </button>
            </div>
            <label className="h-11 rounded-xl bg-surface-muted border border-card-border px-3 flex items-center gap-2 focus-within:border-accent">
              <Search size={15} className="text-text-secondary/50 shrink-0" />
              <input
                value={communitySearch}
                onChange={event => setCommunitySearch(event.target.value)}
                placeholder={communityMode === 'mine' ? 'Search your spaces' : 'Explore communities'}
                className="min-w-0 flex-1 bg-transparent outline-none text-xs font-semibold text-text-main placeholder:text-text-secondary/40"
              />
            </label>
          </div>

          {isLoadingCommunities ? (
            <div className="system-card p-8 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-accent" />
            </div>
          ) : sortedCommunities.length === 0 ? (
            <div className="system-card p-8 text-center">
              {communityMode === 'mine' ? <Users size={28} className="mx-auto text-text-secondary/40 mb-3" /> : <Compass size={28} className="mx-auto text-text-secondary/40 mb-3" />}
              <p className="text-xs font-black uppercase tracking-widest text-text-secondary/50">
                {communityMode === 'mine' ? 'No joined communities yet' : 'No communities found'}
              </p>
              {communityMode === 'mine' && (
                <button
                  onClick={() => setCommunityMode('explore')}
                  className="mt-4 h-10 px-4 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest"
                >
                  Explore Communities
                </button>
              )}
            </div>
          ) : sortedCommunities.map(community => {
            const joined = community.members?.some(member => member.user_id === currentUserId);
            return (
              <button
                key={community.id}
                onClick={() => setSelectedCommunityId(community.id)}
                className={cn(
                  'w-full text-left bg-card border border-card-border rounded-2xl p-4 transition-all group',
                  selectedCommunityId === community.id ? 'border-accent/40 bg-accent/[0.04]' : 'hover:border-accent/25'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: community.color || '#7c3aed' }}>
                    {community.icon ? <span className="text-lg">{community.icon}</span> : <Target size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-black text-text-main uppercase tracking-tight truncate">{community.name}</h3>
                      {joined && <span className="text-[8px] font-black uppercase tracking-widest text-accent">Joined</span>}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40 mt-1">{community.members?.length || 0} members</p>
                    <p className="text-xs text-text-secondary/70 mt-3 line-clamp-2">{community.description || 'A focused place to connect and build.'}</p>
                  </div>
                </div>
              </button>
            );
          })}

          {selectedCommunity && (
            <div className="bg-card border border-card-border rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-accent mb-2">{selectedCommunity.category}</p>
              <h2 className="text-lg font-black uppercase tracking-tight text-text-main">{selectedCommunity.name}</h2>
              <p className="text-xs text-text-secondary/65 mt-2 leading-relaxed">{selectedCommunity.description || 'A focused place to connect and build.'}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
                <Users size={14} /> {selectedCommunity.members?.length || 0} members
              </div>
            </div>
          )}
        </aside>

        <section className="bg-card border border-card-border rounded-[2rem] overflow-hidden min-h-[calc(100vh-11rem)] flex flex-col shadow-soft">
          {!selectedCommunity ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <Users size={36} className="text-text-secondary/30 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Select a community to begin</p>
            </div>
          ) : !isMember ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 rounded-[2rem] bg-accent/10 text-accent flex items-center justify-center mb-6">
                <Users size={34} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-text-main">{selectedCommunity.name}</h2>
              <p className="text-sm text-text-secondary/70 max-w-md mt-3 mb-8">{selectedCommunity.description}</p>
              <button
                onClick={() => joinCommunity(selectedCommunity.id)}
                className="h-12 px-8 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent/20"
              >
                Join Space
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)] flex-1 min-h-0">
                <div className="border-b lg:border-b-0 lg:border-r border-card-border p-4 space-y-4 overflow-y-auto custom-scrollbar lg:max-h-[calc(100vh-12rem)]">
                  <div className="bg-surface-muted rounded-2xl border border-card-border p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(['discussion', 'achievement', 'question'] as CommunityThread['kind'][]).map(kind => {
                        const Icon = kindStyles[kind].icon;
                        return (
                          <button
                            key={kind}
                            onClick={() => setNewThread(prev => ({ ...prev, kind }))}
                            className={cn('h-9 rounded-xl border text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all', newThread.kind === kind ? kindStyles[kind].className : 'border-card-border text-text-secondary/50 bg-card')}
                            title={kindStyles[kind].label}
                          >
                            <Icon size={12} />
                          </button>
                        );
                      })}
                    </div>
                    <input
                      value={newThread.title}
                      onChange={event => setNewThread(prev => ({ ...prev, title: event.target.value }))}
                      placeholder="Start a thread"
                      className="w-full h-10 rounded-xl bg-card border border-card-border px-3 text-xs font-bold outline-none focus:border-accent"
                    />
                    <textarea
                      value={newThread.content}
                      onChange={event => setNewThread(prev => ({ ...prev, content: event.target.value }))}
                      placeholder={newThread.kind === 'achievement' ? 'Share the win...' : 'Open the conversation...'}
                      className="w-full h-20 rounded-xl bg-card border border-card-border p-3 text-xs font-medium outline-none focus:border-accent resize-none"
                    />
                    <button
                      onClick={createThread}
                      disabled={!newThread.title.trim()}
                      className="w-full h-10 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      Publish Thread
                    </button>
                  </div>

                  {isLoadingThreads ? (
                    <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
                  ) : threads.length === 0 ? (
                    <div className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-text-secondary/40">No threads yet</div>
                  ) : (
                    <div className="space-y-2">
                      {threads.map(thread => {
                        const Icon = kindStyles[thread.kind].icon;
                        return (
                          <button
                            key={thread.id}
                            onClick={() => setSelectedThreadId(thread.id)}
                            className={cn('w-full text-left rounded-2xl border p-4 transition-all', selectedThreadId === thread.id ? 'border-accent/40 bg-accent/[0.04]' : 'border-card-border hover:border-accent/20 bg-card')}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', kindStyles[thread.kind].className)}>
                                <Icon size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-text-main leading-tight line-clamp-2">{thread.title}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40 mt-2">@{thread.author?.username || 'user'} - {safeFormat(thread.created_at, 'MMM d, yyyy')}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col min-h-[74vh] lg:min-h-[calc(100vh-12rem)]">
                  {!selectedThread ? (
                    <div className="flex-1 flex items-center justify-center text-center p-10 text-[10px] font-black uppercase tracking-widest text-text-secondary/40">
                      Pick or create a thread
                    </div>
                  ) : (
                    <>
                      <div className="p-5 lg:p-6 border-b border-card-border bg-card">
                        <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-2">{kindStyles[selectedThread.kind].label}</p>
                        <h3 className="text-xl lg:text-2xl font-black text-text-main tracking-tight">{selectedThread.title}</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 lg:p-7 space-y-5 bg-app-container/20">
                        {messages.map(message => {
                          const isOwn = message.user_id === currentUserId;
                          return (
                            <div key={message.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                              <img
                                src={message.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${message.user_id}`}
                                alt={message.author?.username || 'user'}
                                className="w-9 h-9 rounded-xl border border-card-border"
                              />
                              <div className={cn('max-w-[min(88%,860px)] rounded-2xl border border-card-border p-4 lg:p-5 shadow-sm', isOwn ? 'bg-accent text-accent-contrast' : 'bg-card')}>
                                <p className={cn('text-[9px] font-black uppercase tracking-widest mb-2', isOwn ? 'text-accent-contrast/60' : 'text-text-secondary/40')}>
                                  @{message.author?.username || 'user'}
                                </p>
                                <p className="text-sm lg:text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-5 lg:p-6 border-t border-card-border flex gap-3 bg-card">
                        <input
                          value={reply}
                          onChange={event => setReply(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              sendReply();
                            }
                          }}
                          placeholder="Write a reply..."
                          className="flex-1 h-14 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent"
                        />
                        <button
                          onClick={sendReply}
                          disabled={!reply.trim()}
                          className="w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center disabled:opacity-50"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {isCreateOpen && (
          <ResponsiveModal
            open={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            size="md"
            title="Create Community"
            subtitle="Level 5 Creator"
            zIndexClassName="z-[220]"
          >
              <div className="p-5 sm:p-8 space-y-4">
                <input value={newCommunity.name} onChange={event => setNewCommunity(prev => ({ ...prev, name: event.target.value }))} placeholder="Community name" className="w-full h-12 rounded-2xl bg-card border border-card-border px-4 text-sm font-bold outline-none focus:border-accent" />
                <input value={newCommunity.category} onChange={event => setNewCommunity(prev => ({ ...prev, category: event.target.value }))} placeholder="Category" className="w-full h-12 rounded-2xl bg-card border border-card-border px-4 text-sm font-bold outline-none focus:border-accent" />
                <textarea value={newCommunity.description} onChange={event => setNewCommunity(prev => ({ ...prev, description: event.target.value }))} placeholder="What should people build or discuss here?" className="w-full h-32 rounded-2xl bg-card border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
                <button onClick={createCommunity} disabled={!newCommunity.name.trim()} className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                  Create Space
                </button>
              </div>
          </ResponsiveModal>
      )}
    </div>
  );
}
