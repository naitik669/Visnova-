import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  Copy,
  ExternalLink,
  Flag,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Reply,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserPlus,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { SelectMenu } from '../ui/SelectMenu';
import { supabase } from '../../lib/supabase';
import { trackBetaEvent } from '../../lib/betaAnalytics';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { safeDate, safeFormat, safeString } from '../../lib/safeData';
import { MentionHashtagTextarea } from '../Composer/MentionHashtagTextarea';
import { renderSocialText } from '../../utils/parseSocialText';

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
  unreadCount?: number;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  reply_to_message_id?: string | null;
  deleted_at?: string | null;
  failed?: boolean;
  isTemp?: boolean;
};

type SharedPostEmbed = {
  postId: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  caption?: string;
  content?: string;
  mediaUrl?: string;
  createdAt?: number;
};

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

const displayName = (profile?: ProfileLite) => profile?.display_name || profile?.full_name || profile?.username || 'Explorer';
const avatarFor = (profile?: ProfileLite) => profile?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.id || 'visnova'}`;
const cleanProfileSearch = (query: string) => safeString(query).trim().replace(/^@/, '');
const dateKeyFor = (value: string) => safeDate(value).toDateString();
const formatMessageTime = (value: string) => safeFormat(value, 'h:mm a');
const TYPING_IDLE_MS = 2400;
const TYPING_THROTTLE_MS = 1200;
const formatMessageDate = (value: string) => {
  const date = safeDate(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const shortDate = safeFormat(date, 'MMM d');
  if (date.toDateString() === today.toDateString()) return `Today, ${shortDate}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${shortDate}`;
  return safeFormat(date, 'EEEE, MMM d, yyyy');
};
const parsePostEmbed = (content?: string): SharedPostEmbed | null => {
  if (!content?.startsWith('VISNOVA_POST_EMBED\n')) return null;
  try {
    const parsed = JSON.parse(content.replace('VISNOVA_POST_EMBED\n', ''));
    return parsed?.postId ? parsed : null;
  } catch (error) {
    console.error('Failed to parse shared post embed:', error);
    return null;
  }
};
const previewMessage = (message?: Pick<ChatMessage, 'content' | 'deleted_at'> | string) => {
  if (!message) return '';
  if (typeof message !== 'string' && message.deleted_at) return 'Message deleted';
  const content = typeof message === 'string' ? message : message.content;
  const embed = parsePostEmbed(content);
  if (!embed) return content || '';
  return `Post: ${embed.caption || embed.content || 'Shared post'}`;
};

export default function MessagesPage() {
  const { session, addToast, reportUser, setSelectedProfileId } = useStore();
  const navigate = useNavigate();
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reportMessage, setReportMessage] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isProfileReportOpen, setIsProfileReportOpen] = useState(false);
  const [profileReportReason, setProfileReportReason] = useState('spam');
  const [profileReportDetails, setProfileReportDetails] = useState('');
  const [isProfileReporting, setIsProfileReporting] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const remoteTypingTimerRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef(0);

  const selectedId = selected?.id;
  const requestedUserId = searchParams.get('user');
  const messageById = useMemo(() => new Map(messages.map(message => [message.id, message])), [messages]);

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'auto') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  };

  const sendTypingSignal = (typing: boolean) => {
    if (!selectedId || !currentUserId || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversationId: selectedId,
        userId: currentUserId,
        typing
      }
    });
  };

  const stopTyping = () => {
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    lastTypingSentRef.current = 0;
    sendTypingSignal(false);
  };

  const handleHashtagClick = (tag: string) => {
    navigate(`/feed?tab=explore&tag=${encodeURIComponent(tag)}`);
  };

  const handleMentionUsernameClick = async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (error) {
      console.warn('Message mention lookup failed:', error);
      return;
    }
    if (data?.id) setSelectedProfileId(data.id);
  };

  const handleMessageTextChange = (value: string) => {
    setMessageText(value);
    if (!value.trim()) {
      stopTyping();
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      sendTypingSignal(true);
    }

    if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = window.setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_MS);
  };

  const markConversationRead = async (conversationId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase.rpc('mark_conversation_read', { target_conversation_id: conversationId });
    if (error) {
      console.error('Failed to mark messages read:', error);
      return;
    }

    setMessages(current => current.map(message => (
      message.conversation_id === conversationId && message.user_id !== currentUserId && !message.read_at
        ? { ...message, read_at: new Date().toISOString() }
        : message
    )));
    setConversations(current => current.map(conversation => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation));
    window.dispatchEvent(new Event('visnova-messages-read'));
  };

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
          .select('conversation_id, user_id, content, created_at, read_at, deleted_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      ]);

      if (participantError) throw participantError;
      if (messageError) throw messageError;

      const latestByConversation = new Map<string, any>();
      const unreadByConversation = new Map<string, number>();
      (messageRows || []).forEach((message: any) => {
        if (!latestByConversation.has(message.conversation_id)) {
          latestByConversation.set(message.conversation_id, message);
        }
        if (message.user_id !== currentUserId && !message.read_at && !message.deleted_at) {
          unreadByConversation.set(message.conversation_id, (unreadByConversation.get(message.conversation_id) || 0) + 1);
        }
      });

      const nextConversations: ConversationItem[] = conversationIds.map((id) => {
        const other = (participantRows || []).find((row: any) => row.conversation_id === id && row.user_id !== currentUserId);
        const otherProfile = Array.isArray(other?.profile) ? other.profile[0] : other?.profile;
        const latest = latestByConversation.get(id);
        return {
          id,
          profile: otherProfile || { id },
          lastMessage: previewMessage(latest),
          lastAt: latest?.created_at,
          unreadCount: unreadByConversation.get(id) || 0
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
        .select('id, conversation_id, user_id, content, created_at, read_at, reply_to_message_id, deleted_at, failed')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
      await markConversationRead(conversationId);
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
    setIsOtherTyping(false);
    const channelId = `messages:${selectedId}`;
    const channel = supabase
      .channel(channelId, {
        config: {
          broadcast: { self: false }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.conversationId !== selectedId || payload?.userId === currentUserId) return;
        if (remoteTypingTimerRef.current) window.clearTimeout(remoteTypingTimerRef.current);
        setIsOtherTyping(!!payload?.typing);
        if (payload?.typing) {
          remoteTypingTimerRef.current = window.setTimeout(() => {
            setIsOtherTyping(false);
            remoteTypingTimerRef.current = null;
          }, TYPING_IDLE_MS + 900);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const next = payload.new as ChatMessage;
        setMessages((current) => current.some((m) => m.id === next.id) ? current : [...current, next]);
        if (next.user_id !== currentUserId) setIsOtherTyping(false);
        if (next.user_id !== currentUserId) markConversationRead(selectedId);
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        const next = payload.new as ChatMessage;
        setMessages((current) => current.map((message) => message.id === next.id ? next : message));
        loadConversations();
      })
      .subscribe();
    typingChannelRef.current = channel;

    return () => {
      stopTyping();
      if (remoteTypingTimerRef.current) {
        window.clearTimeout(remoteTypingTimerRef.current);
        remoteTypingTimerRef.current = null;
      }
      setIsOtherTyping(false);
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [selectedId, currentUserId]);

  useEffect(() => {
    if (!selectedId || isLoadingMessages) return;
    scrollMessagesToBottom('auto');
  }, [selectedId, isLoadingMessages, messages.length, isOtherTyping]);

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

  const sendMessage = async (override?: { content: string; tempId?: string }) => {
    const content = (override?.content || messageText).trim();
    if (!content || !selectedId || !currentUserId || isSending) return;

    const tempId = override?.tempId || `temp-${Date.now()}`;
    setIsSending(true);
    if (!override) setMessageText('');
    stopTyping();
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedId,
          user_id: currentUserId,
          content,
          reply_to_message_id: replyTo?.id || null
        })
        .select('id, conversation_id, user_id, content, created_at, read_at, reply_to_message_id, deleted_at, failed')
        .single();

      if (error) throw error;
      setMessages((current) => {
        const withoutTemp = current.filter((m) => m.id !== tempId);
        return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
      });
      setReplyTo(null);
      trackBetaEvent(currentUserId, 'message_sent', {
        has_reply: Boolean(replyTo?.id),
        is_resend: Boolean(override?.tempId)
      }, data.id);
      loadConversations();
    } catch (error: any) {
      if (!override) {
        setMessages((current) => [...current, {
          id: tempId,
          conversation_id: selectedId,
          user_id: currentUserId,
          content,
          created_at: new Date().toISOString(),
          failed: true,
          isTemp: true,
          reply_to_message_id: replyTo?.id || null
        }]);
      }
      console.error('Failed to send message:', error);
      addToast({ type: 'error', title: 'Send failed', description: error.message || 'Could not send message.' });
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (message: ChatMessage) => {
    setOpenMenuId(null);
    if (message.isTemp) {
      setMessages(current => current.filter(item => item.id !== message.id));
      return;
    }
    if (message.user_id !== currentUserId) {
      addToast({ type: 'error', title: 'Not allowed', description: 'You can only delete your own messages.' });
      return;
    }

    const previous = messages;
    setMessages(current => current.map(item => item.id === message.id ? { ...item, deleted_at: new Date().toISOString(), content: '' } : item));
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString(), content: '' })
      .eq('id', message.id)
      .eq('user_id', currentUserId);

    if (error) {
      setMessages(previous);
      addToast({ type: 'error', title: 'Delete failed', description: error.message || 'Could not delete message.' });
    } else {
      addToast({ type: 'success', title: 'Message deleted' });
      loadConversations();
    }
  };

  const copyMessage = async (message: ChatMessage) => {
    setOpenMenuId(null);
    if (message.deleted_at) return;
    await navigator.clipboard?.writeText(previewMessage(message));
    addToast({ type: 'success', title: 'Copied' });
  };

  const submitReport = async () => {
    if (!reportMessage || !currentUserId || isReporting) return;
    if (reportMessage.user_id === currentUserId) {
      addToast({ type: 'error', title: 'Not allowed', description: 'You cannot report your own message.' });
      return;
    }

    setIsReporting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUserId,
      target_type: 'message',
      target_id: reportMessage.id,
      target_owner_id: reportMessage.user_id,
      reason: reportReason,
      details: reportDetails.trim() || null
    });
    setIsReporting(false);

    if (error) {
      const duplicate = error.code === '23505';
      addToast({
        type: duplicate ? 'info' : 'error',
        title: duplicate ? 'Already reported' : 'Report failed',
        description: duplicate ? 'You already reported this message.' : error.message || 'Could not submit report.'
      });
      if (duplicate) setReportMessage(null);
      return;
    }

    addToast({ type: 'success', title: 'Report submitted', description: 'Thanks. We saved this for review.' });
    setReportMessage(null);
    setReportDetails('');
    setReportReason('spam');
  };

  const submitProfileReport = async () => {
    if (!selected?.profile.id || isProfileReporting) return;
    setIsProfileReporting(true);
    const ok = await reportUser(selected.profile.id, profileReportReason, profileReportDetails);
    setIsProfileReporting(false);
    if (ok) {
      setIsProfileReportOpen(false);
      setProfileReportReason('spam');
      setProfileReportDetails('');
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
    <div className="mx-auto h-[calc(100dvh-8.25rem)] min-h-0 w-full max-w-7xl overflow-hidden pb-1 animate-in fade-in duration-700 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[540px] lg:max-h-[calc(100dvh-6.5rem)] lg:pb-0">
      <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(150px,28%)_minmax(0,1fr)] gap-3 lg:grid-cols-[360px_1fr] lg:grid-rows-1 lg:gap-6">
        <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-card-border bg-card lg:rounded-[2rem]">
          <div className="shrink-0 border-b border-card-border p-4 lg:p-5">
            <div className="mb-3 flex items-center gap-3 lg:mb-4">
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

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2.5 lg:p-3">
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
                  'w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-colors lg:p-4',
                  selected?.id === conversation.id ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface-muted border border-transparent'
                )}
              >
                <img src={avatarFor(conversation.profile)} className="w-11 h-11 rounded-xl border border-card-border" alt={displayName(conversation.profile)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase text-text-main truncate">{displayName(conversation.profile)}</p>
                  <p className="text-[10px] font-medium text-text-secondary/50 truncate">{conversation.lastMessage || `@${conversation.profile.username || 'user'}`}</p>
                </div>
                {!!conversation.unreadCount && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-contrast text-[10px] font-black flex items-center justify-center">
                    {conversation.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-card-border bg-card lg:rounded-[2rem]">
          {selected ? (
            <>
              <header className="flex h-16 shrink-0 items-center gap-3 border-b border-card-border px-4 sm:h-20 sm:gap-4 sm:px-6">
                <img src={avatarFor(selected.profile)} className="w-11 h-11 rounded-xl border border-card-border" alt={selectedTitle} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black uppercase tracking-widest text-text-main">{selectedTitle}</h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-accent">@{selected.profile.username || 'user'}</p>
                </div>
                <button
                  onClick={() => setIsProfileReportOpen(true)}
                  className="h-10 w-10 rounded-xl bg-danger/10 border border-danger/15 text-danger flex items-center justify-center hover:bg-danger/15 transition-all"
                  aria-label="Report profile"
                  title="Report profile"
                >
                  <Flag size={16} />
                </button>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-app-container/40 p-3 sm:p-6">
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
                  const postEmbed = parsePostEmbed(message.content);
                  const repliedTo = message.reply_to_message_id ? messageById.get(message.reply_to_message_id) : null;
                  const deleted = !!message.deleted_at;
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
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('group flex items-start gap-2', isMine ? 'justify-end' : 'justify-start')}>
                        {!isMine && <MessageActions message={message} isMine={isMine} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} setReplyTo={setReplyTo} deleteMessage={deleteMessage} copyMessage={copyMessage} setReportMessage={setReportMessage} resendMessage={sendMessage} />}
                        <div className={cn('max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed sm:max-w-[82%]', isMine ? 'bg-accent text-accent-contrast border-accent' : 'bg-card text-text-main border-card-border', deleted && 'bg-surface-muted text-text-secondary border-card-border italic')}>
                          {repliedTo && (
                            <div className={cn('mb-2 rounded-xl border-l-2 px-3 py-2 text-xs', isMine ? 'bg-accent-contrast/10 border-accent-contrast/40 text-accent-contrast/75' : 'bg-surface-muted border-accent/50 text-text-secondary')}>
                              <p className="font-black uppercase tracking-widest text-[9px]">{repliedTo.user_id === currentUserId ? 'You' : selectedTitle}</p>
                              <p className="line-clamp-2">{previewMessage(repliedTo) || 'Original message deleted'}</p>
                            </div>
                          )}
                          {deleted ? (
                            <p>Message deleted</p>
                          ) : postEmbed ? (
                            <Link
                              to={`/post/${postEmbed.postId}`}
                              className={cn(
                                'block overflow-hidden rounded-2xl border text-left transition-transform hover:scale-[1.01] active:scale-[0.99]',
                                isMine ? 'border-accent-contrast/25 bg-accent-contrast/10' : 'border-card-border bg-surface-muted/60'
                              )}
                            >
                              {postEmbed.mediaUrl ? (
                                <img src={postEmbed.mediaUrl} alt="Shared post" className="h-40 w-full object-cover" />
                              ) : (
                                <div className={cn('h-24 w-full flex items-center justify-center', isMine ? 'bg-accent-contrast/10' : 'bg-card')}>
                                  <ImageIcon size={24} className={isMine ? 'text-accent-contrast/50' : 'text-text-secondary/30'} />
                                </div>
                              )}
                              <div className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  {postEmbed.authorAvatar && <img src={postEmbed.authorAvatar} alt="" className="w-7 h-7 rounded-lg object-cover" />}
                                  <div className="min-w-0">
                                    <p className={cn('text-[10px] font-black uppercase tracking-widest truncate', isMine ? 'text-accent-contrast' : 'text-text-main')}>
                                      {postEmbed.authorName || 'VisNova post'}
                                    </p>
                                    <p className={cn('text-[9px] font-bold truncate', isMine ? 'text-accent-contrast/60' : 'text-text-secondary/50')}>
                                      {postEmbed.authorHandle || 'Open post'}
                                    </p>
                                  </div>
                                  <ExternalLink size={14} className={cn('ml-auto shrink-0', isMine ? 'text-accent-contrast/60' : 'text-text-secondary/40')} />
                                </div>
                                <p className={cn('line-clamp-3 text-xs font-semibold leading-relaxed', isMine ? 'text-accent-contrast/85' : 'text-text-secondary')}>
                                  {postEmbed.caption || postEmbed.content || 'Open this shared post.'}
                                </p>
                              </div>
                            </Link>
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {renderSocialText(message.content, [], {
                                onHashtagClick: handleHashtagClick,
                                onMentionUsernameClick: handleMentionUsernameClick
                              })}
                            </p>
                          )}
                          <p className={cn('mt-2 text-[9px] font-black uppercase tracking-widest', isMine ? 'text-accent-contrast/60 text-right' : 'text-text-secondary/40')}>
                            {message.failed ? 'Failed' : formatMessageTime(message.created_at)}
                            {isMine && !message.failed && <span className="ml-2">{message.read_at ? 'Seen' : 'Sent'}</span>}
                          </p>
                        </div>
                        {isMine && <MessageActions message={message} isMine={isMine} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} setReplyTo={setReplyTo} deleteMessage={deleteMessage} copyMessage={copyMessage} setReportMessage={setReportMessage} resendMessage={sendMessage} />}
                      </motion.div>
                    </div>
                  );
                })}
                {isOtherTyping && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-card border border-card-border px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary shadow-sm">
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:240ms]" />
                      </span>
                      {selectedTitle} is typing
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1" aria-hidden="true" />
              </div>

              <footer className="shrink-0 border-t border-card-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-5">
                {replyTo && (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-surface-muted border border-card-border px-4 py-3">
                    <Reply size={14} className="text-accent shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Replying to {replyTo.user_id === currentUserId ? 'your message' : selectedTitle}</p>
                      <p className="text-xs font-semibold text-text-main line-clamp-1">{previewMessage(replyTo)}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="w-8 h-8 rounded-xl hover:bg-card flex items-center justify-center text-text-secondary" aria-label="Cancel reply">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 sm:gap-3">
                  <MentionHashtagTextarea
                    value={messageText}
                    onChange={handleMessageTextChange}
                    onBlur={stopTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={`Message @${selected.profile.username || 'user'}...`}
                    className="flex-1"
                    textareaClassName="w-full h-11 sm:h-12 max-h-24 overflow-y-auto rounded-2xl bg-surface-muted border border-card-border px-4 py-3 text-sm font-medium outline-none resize-none focus:border-accent/50"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={isSending || !messageText.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-contrast shadow-lg shadow-accent/20 disabled:opacity-50 sm:h-12 sm:w-12"
                    aria-label="Send message"
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

      <ResponsiveModal open={!!reportMessage} onClose={() => setReportMessage(null)} title="Report message" subtitle="Reports are private and help keep VisNova safe." size="sm">
        <div className="p-5 space-y-4">
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Reason</span>
            <SelectMenu value={reportReason} onChange={setReportReason} options={reportReasons} />
          </label>
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details optional</span>
            <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value.slice(0, 1000))} className="w-full min-h-28 rounded-2xl bg-surface-muted border border-card-border px-4 py-3 text-sm font-semibold text-text-main outline-none resize-none focus:border-accent" placeholder="Add context for moderators..." />
          </label>
          <button onClick={submitReport} disabled={isReporting} className="w-full h-12 rounded-2xl bg-danger text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {isReporting && <Loader2 size={16} className="animate-spin" />}
            Submit Report
          </button>
        </div>
      </ResponsiveModal>

      <ResponsiveModal open={isProfileReportOpen} onClose={() => setIsProfileReportOpen(false)} title="Report profile" subtitle="Reports are private and help keep VisNova safe." size="sm">
        <div className="p-5 space-y-4">
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Reason</span>
            <SelectMenu value={profileReportReason} onChange={setProfileReportReason} options={reportReasons} />
          </label>
          <label className="space-y-2 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Details optional</span>
            <textarea value={profileReportDetails} onChange={(event) => setProfileReportDetails(event.target.value.slice(0, 1000))} className="w-full min-h-28 rounded-2xl bg-surface-muted border border-card-border px-4 py-3 text-sm font-semibold text-text-main outline-none resize-none focus:border-accent" placeholder="Add context for moderators..." />
          </label>
          <button onClick={submitProfileReport} disabled={isProfileReporting} className="w-full h-12 rounded-2xl bg-danger text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
            {isProfileReporting && <Loader2 size={16} className="animate-spin" />}
            Submit Report
          </button>
        </div>
      </ResponsiveModal>
    </div>
  );
}

type MessageActionsProps = {
  message: ChatMessage;
  isMine: boolean;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  setReplyTo: (message: ChatMessage) => void;
  deleteMessage: (message: ChatMessage) => void;
  copyMessage: (message: ChatMessage) => void;
  setReportMessage: (message: ChatMessage) => void;
  resendMessage: (override: { content: string; tempId?: string }) => void;
};

function MessageActions({ message, isMine, openMenuId, setOpenMenuId, setReplyTo, deleteMessage, copyMessage, setReportMessage, resendMessage }: MessageActionsProps) {
  const isOpen = openMenuId === message.id;
  const deleted = !!message.deleted_at;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenuId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, setOpenMenuId]);

  return (
    <div ref={menuRef} className="relative z-50 shrink-0">
      <button
        onClick={() => setOpenMenuId(isOpen ? null : message.id)}
        className="w-8 h-8 rounded-xl bg-card border border-card-border text-text-secondary hover:text-text-main flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        aria-label="Message options"
      >
        <MoreHorizontal size={15} />
      </button>
      {isOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className={cn(
            'visnova-menu fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] w-auto p-1.5 z-[240] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-10 sm:w-48',
            isMine ? 'sm:right-0' : 'sm:left-0'
          )}
        >
          {!deleted && (
            <button onClick={() => { setReplyTo(message); setOpenMenuId(null); }} className="visnova-menu-item">
              <Reply size={14} /> Reply
            </button>
          )}
          {message.failed && isMine && !deleted && (
            <button onClick={() => { setOpenMenuId(null); resendMessage({ content: message.content, tempId: message.id }); }} className="visnova-menu-item">
              <RotateCcw size={14} /> Resend
            </button>
          )}
          {!deleted && (
            <button onClick={() => copyMessage(message)} className="visnova-menu-item">
              <Copy size={14} /> Copy
            </button>
          )}
          {isMine ? (
            <button onClick={() => deleteMessage(message)} className="visnova-menu-item visnova-menu-item-danger">
              <Trash2 size={14} /> Unsend
            </button>
          ) : (
            !deleted && (
              <button onClick={() => { setReportMessage(message); setOpenMenuId(null); }} className="visnova-menu-item visnova-menu-item-danger">
                <Flag size={14} /> Report
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
