import { useEffect, useMemo, useState } from 'react';
import { AtSign, Loader2, MessageCircle, Search, Send, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

type ProfileLite = {
  id: string;
  username?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
};

type ConversationItem = {
  id: string;
  profile: ProfileLite;
  lastMessage?: string;
  lastAt?: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

const displayName = (profile?: ProfileLite) => profile?.display_name || profile?.full_name || profile?.username || 'Explorer';
const avatarFor = (profile?: ProfileLite) => profile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.id || 'visnova'}`;
const cleanProfileSearch = (query: string) => query.trim().replace(/^@/, '');
const dateKeyFor = (value: string) => new Date(value).toDateString();
const formatMessageTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatMessageDate = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const shortDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (date.toDateString() === today.toDateString()) return `Today, ${shortDate}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${shortDate}`;
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
};

export default function MessagesPage() {
  const { session, addToast } = useStore();
  const [searchParams] = useSearchParams();
  const currentUserId = session?.user?.id;
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selected, setSelected] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedId = selected?.id;
  const requestedUserId = searchParams.get('user');

  const loadConversations = async () => {
    if (!currentUserId) return;
    setIsLoadingConversations(true);
    try {
      const { data: mine, error: mineError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (mineError) throw mineError;
      const conversationIds = Array.from(new Set((mine || []).map((row: any) => row.conversation_id)));
      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const [{ data: participantRows, error: participantError }, { data: messageRows, error: messageError }] = await Promise.all([
        supabase
          .from('conversation_participants')
          .select('conversation_id, user_id, profile:profiles!conversation_participants_user_id_fkey(id, username, display_name, full_name, avatar_url, bio)')
          .in('conversation_id', conversationIds),
        supabase
          .from('messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      ]);

      if (participantError) throw participantError;
      if (messageError) throw messageError;

      const latestByConversation = new Map<string, any>();
      (messageRows || []).forEach((message: any) => {
        if (!latestByConversation.has(message.conversation_id)) {
          latestByConversation.set(message.conversation_id, message);
        }
      });

      const nextConversations: ConversationItem[] = conversationIds.map((id) => {
        const other = (participantRows || []).find((row: any) => row.conversation_id === id && row.user_id !== currentUserId);
        const otherProfile = Array.isArray(other?.profile) ? other.profile[0] : other?.profile;
        const latest = latestByConversation.get(id);
        return {
          id,
          profile: otherProfile || { id },
          lastMessage: latest?.content,
          lastAt: latest?.created_at
        };
      }).sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());

      setConversations(nextConversations);
      setSelected((current) => current || nextConversations[0] || null);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      addToast({ type: 'error', title: 'Messages failed', description: error.message || 'Could not load conversations.' });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUserId]);

  useEffect(() => {
    const query = cleanProfileSearch(searchQuery);
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const searchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, bio')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', currentUserId || '')
        .limit(8);

      if (cancelled) return;
      if (error) {
        console.error('Profile search failed:', error);
        setSearchResults([]);
      } else {
        setSearchResults(data || []);
      }
    };

    searchProfiles();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, currentUserId]);

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, user_id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      addToast({ type: 'error', title: 'Chat failed', description: error.message || 'Could not load messages.' });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedId);
    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        setMessages((current) => current.some((m) => m.id === (payload.new as ChatMessage).id) ? current : [...current, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  const startConversation = async (profile: ProfileLite) => {
    try {
      const { data, error } = await supabase.rpc('start_direct_conversation', { other_user_id: profile.id });
      if (error) throw error;
      const item = { id: data as string, profile };
      setSelected(item);
      setSearchQuery('');
      setSearchResults([]);
      await loadConversations();
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      addToast({ type: 'error', title: 'Chat failed', description: error.message || 'Could not start this chat.' });
    }
  };

  useEffect(() => {
    if (!requestedUserId || !currentUserId || requestedUserId === currentUserId) return;
    if (selected?.profile.id === requestedUserId) return;

    let cancelled = false;
    const openRequestedProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, bio')
        .eq('id', requestedUserId)
        .maybeSingle();

      if (cancelled || error || !data) return;
      await startConversation(data);
    };

    openRequestedProfile();
    return () => {
      cancelled = true;
    };
  }, [requestedUserId, currentUserId]);

  const sendMessage = async () => {
    const content = messageText.trim();
    if (!content || !selectedId || !currentUserId || isSending) return;

    setIsSending(true);
    setMessageText('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: selectedId, user_id: currentUserId, content })
        .select('id, conversation_id, user_id, content, created_at')
        .single();

      if (error) throw error;
      setMessages((current) => current.some((m) => m.id === data.id) ? current : [...current, data]);
      loadConversations();
    } catch (error: any) {
      setMessageText(content);
      console.error('Failed to send message:', error);
      addToast({ type: 'error', title: 'Send failed', description: error.message || 'Could not send message.' });
    } finally {
      setIsSending(false);
    }
  };

  const selectedTitle = useMemo(() => displayName(selected?.profile), [selected]);

  if (!currentUserId) {
    return (
      <div className="h-full flex items-center justify-center text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Sign in to use messages.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-full min-h-[72vh] animate-in fade-in duration-700">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-card border border-card-border rounded-[2rem] overflow-hidden flex flex-col min-h-[620px]">
          <div className="p-5 border-b border-card-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-text-main">Messages</h2>
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/40">Connections and direct chats</p>
              </div>
            </div>
            <div className="relative">
              <AtSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="@username or profile name"
                className="w-full h-11 rounded-2xl bg-surface-muted border border-card-border pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-text-main placeholder:text-text-secondary/25 outline-none focus:border-accent/50"
              />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="p-3 border-b border-card-border bg-surface-muted/30">
              <p className="px-3 py-2 text-[8px] font-black uppercase tracking-widest text-text-secondary/40 flex items-center gap-2"><Search size={12} /> Profile Results</p>
              {searchResults.map((profile) => (
                <button key={profile.id} onClick={() => startConversation(profile)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition-colors text-left">
                  <img src={avatarFor(profile)} className="w-10 h-10 rounded-xl border border-card-border" alt={displayName(profile)} />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-text-main truncate">{displayName(profile)}</p>
                    <p className="text-[9px] font-bold text-accent uppercase tracking-widest">@{profile.username || 'user'}</p>
                  </div>
                  <UserPlus size={14} className="ml-auto text-text-secondary/40" />
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingConversations ? (
              <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-accent" size={24} /></div>
            ) : conversations.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Search @username to start your first chat.</p>
              </div>
            ) : conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelected(conversation)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors',
                  selected?.id === conversation.id ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface-muted border border-transparent'
                )}
              >
                <img src={avatarFor(conversation.profile)} className="w-11 h-11 rounded-xl border border-card-border" alt={displayName(conversation.profile)} />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-text-main truncate">{displayName(conversation.profile)}</p>
                  <p className="text-[10px] font-medium text-text-secondary/50 truncate">{conversation.lastMessage || `@${conversation.profile.username || 'user'}`}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-card border border-card-border rounded-[2rem] overflow-hidden flex flex-col min-h-[620px]">
          {selected ? (
            <>
              <header className="h-20 border-b border-card-border px-6 flex items-center gap-4">
                <img src={avatarFor(selected.profile)} className="w-11 h-11 rounded-xl border border-card-border" alt={selectedTitle} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-text-main">{selectedTitle}</h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-accent">@{selected.profile.username || 'user'}</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-app-container/40">
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-accent" size={24} /></div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">No messages yet. Start the thread.</p>
                  </div>
                ) : messages.map((message, index) => {
                  const isMine = message.user_id === currentUserId;
                  const previous = messages[index - 1];
                  const showDateDivider = !previous || dateKeyFor(previous.created_at) !== dateKeyFor(message.created_at);
                  return (
                    <div key={message.id} className="space-y-4">
                      {showDateDivider && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="h-px flex-1 bg-card-border" />
                          <span className="px-3 py-1 rounded-full bg-card border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary/50">
                            {formatMessageDate(message.created_at)}
                          </span>
                          <div className="h-px flex-1 bg-card-border" />
                        </div>
                      )}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed border', isMine ? 'bg-accent text-accent-contrast border-accent' : 'bg-card text-text-main border-card-border')}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className={cn('mt-2 text-[9px] font-black uppercase tracking-widest', isMine ? 'text-accent-contrast/60 text-right' : 'text-text-secondary/40')}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              <footer className="p-5 border-t border-card-border bg-card">
                <div className="flex items-end gap-3">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={`Message @${selected.profile.username || 'user'}...`}
                    className="flex-1 min-h-12 max-h-32 rounded-2xl bg-surface-muted border border-card-border px-4 py-3 text-sm font-medium outline-none resize-none focus:border-accent/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isSending || !messageText.trim()}
                    className="h-12 w-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-accent/10 text-accent flex items-center justify-center">
                <MessageCircle size={28} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Select a chat or search @username to begin.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
