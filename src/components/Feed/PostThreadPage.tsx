import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Bookmark, Edit3, Flag, Heart, Image as ImageIcon, Loader2, MessageSquare, MoreHorizontal, Send, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { Comment, Post } from '../../types';
import VerifiedBadge from '../VerifiedBadge';
import { notificationService } from '../../services/notificationService';
import { safeArray, safeFormat, safeString, safeTime } from '../../lib/safeData';
import { PostEditModal, PostReportModal } from './CommunityFeed';

const COMMENTS_PAGE_SIZE = 50;

const mapPostRow = (p: any): Post => ({
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
  type: (p?.type || 'update') as Post['type'],
  visibility: (p?.visibility || 'public') as Post['visibility'],
  archived: !!p?.archived,
  archivedAt: p?.archived_at || null,
  deletedAt: p?.deleted_at || null,
  editedAt: p?.edited_at || null,
  media: safeArray<any>(p?.media).map((m: any) => ({ id: m.id, url: m.media_url, type: (m.media_type || 'image') as 'image' | 'video' })),
  tags: safeArray<any>(p?.post_tags).map((t: any) => t.tag).filter(Boolean)
});

const mapCommentRow = (comment: any): Comment => ({
  id: safeString(comment?.id),
  postId: safeString(comment?.post_id),
  userId: safeString(comment?.user_id),
  author: {
    name: safeString(comment?.author?.display_name || comment?.author?.full_name, 'Explorer'),
    avatar: safeString(comment?.author?.avatar_url, `https://api.dicebear.com/7.x/shapes/svg?seed=${safeString(comment?.user_id, 'user')}`),
    handle: `@${safeString(comment?.author?.username, 'user')}`,
    verified: !!comment?.author?.verified
  },
  content: safeString(comment?.content),
  timestamp: safeFormat(comment?.created_at, 'MMM d, h:mm a')
});

export default function PostThreadPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { addComment, session, addToast, updatePost, archivePost, restorePost, deletePost, reportPost } = useStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');

  const firstImage = useMemo(() => post?.media?.find(item => item.type === 'image'), [post]);

  const loadThread = async () => {
    if (!postId) return;
    setIsLoading(true);
    try {
      const [{ data: postRow, error: postError }, { data: commentRows, error: commentError }] = await Promise.all([
        supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_user_id_fkey(*),
            likes:post_likes(count),
            saves:saved_posts(count),
            comment_count:comments(count),
            media:post_media(*),
            post_tags(*)
          `)
          .eq('id', postId)
          .maybeSingle(),
        supabase
          .from('comments')
          .select('*, author:profiles!comments_user_id_fkey(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .range(0, COMMENTS_PAGE_SIZE)
      ]);

      if (postError) throw postError;
      if (commentError) throw commentError;
      if (postRow) {
        const nextPost = mapPostRow(postRow);
        if (nextPost.deletedAt || (nextPost.archived && nextPost.userId !== session?.user?.id)) {
          setPost(null);
          setComments([]);
          setHasMoreComments(false);
          return;
        }
        if (session?.user?.id) {
          const [{ data: likeRow }, { data: saveRow }] = await Promise.all([
            supabase.from('post_likes').select('post_id').eq('post_id', postId).eq('user_id', session.user.id).maybeSingle(),
            supabase.from('saved_posts').select('post_id').eq('post_id', postId).eq('user_id', session.user.id).maybeSingle()
          ]);
          nextPost.isLiked = !!likeRow;
          nextPost.isSaved = !!saveRow;
        }
        setPost(nextPost);
      } else {
        setPost(null);
      }
      const mappedComments = (commentRows || []).map(mapCommentRow);
      setComments(mappedComments.slice(0, COMMENTS_PAGE_SIZE));
      setHasMoreComments(mappedComments.length > COMMENTS_PAGE_SIZE);
    } catch (error: any) {
      console.error('Failed to load post thread:', error);
      addToast({ type: 'error', title: 'Thread failed', description: error.message || 'Could not load this post.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreComments = async () => {
    if (!postId || isLoadingMoreComments || !hasMoreComments) return;
    setIsLoadingMoreComments(true);
    try {
      const from = comments.length;
      const to = from + COMMENTS_PAGE_SIZE;
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles!comments_user_id_fkey(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const mappedComments = (data || []).map(mapCommentRow);
      setComments(current => [...current, ...mappedComments.slice(0, COMMENTS_PAGE_SIZE)]);
      setHasMoreComments(mappedComments.length > COMMENTS_PAGE_SIZE);
    } catch (error: any) {
      console.error('Failed to load more comments:', error);
      addToast({ type: 'error', title: 'Comments failed', description: error.message || 'Could not load more comments.' });
    } finally {
      setIsLoadingMoreComments(false);
    }
  };

  useEffect(() => {
    loadThread();
  }, [postId]);

  const submitComment = async () => {
    if (!postId || !commentText.trim() || isCommenting) return;
    setIsCommenting(true);
    const draft = commentText;
    setCommentText('');
    const saved = await addComment(postId, draft);
    if (saved) {
      setComments(current => [...current, mapCommentRow(saved)]);
      setPost(current => current ? { ...current, comments: current.comments + 1 } : current);
    } else {
      setCommentText(draft);
    }
    setIsCommenting(false);
  };

  const toggleThreadLike = async () => {
    if (!post || !session?.user?.id) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to like posts.' });
      return;
    }
    const wasLiked = !!post.isLiked;
    setPost(current => current ? { ...current, isLiked: !wasLiked, likes: Math.max(0, current.likes + (wasLiked ? -1 : 1)) } : current);
    try {
      if (wasLiked) {
        const { error } = await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: session.user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: post.id, user_id: session.user.id });
        if (error) throw error;
        if (post.userId !== session.user.id) {
          await notificationService.send({ userId: post.userId, actorId: session.user.id, type: 'like', postId: post.id, message: 'liked your post' });
        }
      }
    } catch (error) {
      console.error('Failed to toggle thread like:', error);
      setPost(current => current ? { ...current, isLiked: wasLiked, likes: Math.max(0, current.likes + (wasLiked ? 1 : -1)) } : current);
      addToast({ type: 'error', title: 'Like failed', description: 'Could not save your like.' });
    }
  };

  const toggleThreadSave = async () => {
    if (!post || !session?.user?.id) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to save posts.' });
      return;
    }
    const wasSaved = !!post.isSaved;
    setPost(current => current ? { ...current, isSaved: !wasSaved, saves: Math.max(0, current.saves + (wasSaved ? -1 : 1)) } : current);
    try {
      if (wasSaved) {
        const { error } = await supabase.from('saved_posts').delete().match({ post_id: post.id, user_id: session.user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_posts').insert({ post_id: post.id, user_id: session.user.id });
        if (error) throw error;
        if (post.userId !== session.user.id) {
          await notificationService.send({ userId: post.userId, actorId: session.user.id, type: 'save', postId: post.id, message: 'saved your post' });
        }
      }
    } catch (error) {
      console.error('Failed to toggle thread save:', error);
      setPost(current => current ? { ...current, isSaved: wasSaved, saves: Math.max(0, current.saves + (wasSaved ? 1 : -1)) } : current);
      addToast({ type: 'error', title: 'Save failed', description: 'Could not update saved posts.' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm font-black uppercase tracking-widest text-text-secondary/50">Post not found.</p>
        <button onClick={() => navigate('/feed')} className="h-11 px-5 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">Back to Feed</button>
      </div>
    );
  }

  return (
    <>
    <div className="w-full max-w-5xl mx-auto pb-10 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="mb-5 h-11 px-4 rounded-xl bg-card border border-card-border text-text-secondary hover:text-text-main flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <article className="bg-card border border-card-border rounded-[2rem] overflow-hidden shadow-sm">
          {firstImage ? (
            <img src={firstImage.url} alt="Post media" className="w-full max-h-[520px] object-cover bg-surface-muted" />
          ) : (
            <div className="h-40 bg-surface-muted flex items-center justify-center text-text-secondary/30">
              <ImageIcon size={34} />
            </div>
          )}
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
              <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-2xl object-cover border border-card-border" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link to={`/profile?user=${post.author.id}`} className="text-sm font-black uppercase tracking-widest text-text-main truncate hover:text-accent">
                    {post.author.name}
                  </Link>
                  <VerifiedBadge verified={post.author.verified} size={15} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">
                  {post.author.handle} - {post.timestamp}
                  {post.editedAt && <span> - Edited {safeFormat(post.editedAt, 'MMM d, h:mm a')}</span>}
                </p>
              </div>
              </div>
              {session?.user?.id && (
                <div className="relative shrink-0">
                  <button onClick={() => setIsMenuOpen(open => !open)} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/50 hover:text-text-main" aria-label="Post options">
                    <MoreHorizontal size={18} />
                  </button>
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div initial={{ opacity: 0, scale: 0.96, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -4 }} onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} className="visnova-menu fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-56 max-h-[70dvh] overflow-y-auto custom-scrollbar p-1.5 z-[240]">
                        {post.userId === session.user.id ? (
                          <>
                            <button onClick={() => { setIsMenuOpen(false); setIsEditOpen(true); }} className="visnova-menu-item"><Edit3 size={14} /> Edit Post</button>
                            {!post.archived ? (
                              <button onClick={async () => { setIsMenuOpen(false); const ok = await archivePost(post.id); if (ok) setPost(current => current ? { ...current, archived: true, archivedAt: new Date().toISOString() } : current); }} className="visnova-menu-item"><Archive size={14} /> Archive Post</button>
                            ) : (
                              <button onClick={async () => { setIsMenuOpen(false); const ok = await restorePost(post.id); if (ok) setPost(current => current ? { ...current, archived: false, archivedAt: null } : current); }} className="visnova-menu-item"><Archive size={14} /> Restore Post</button>
                            )}
                            <button onClick={async () => { if (!confirm('Delete this post? This will remove it from your profile and feeds.')) return; setIsMenuOpen(false); const ok = await deletePost(post.id); if (ok) navigate('/feed'); }} className="visnova-menu-item visnova-menu-item-danger"><Trash2 size={14} /> Delete Post</button>
                          </>
                        ) : (
                          <button onClick={() => { setIsMenuOpen(false); setIsReportOpen(true); }} className="visnova-menu-item visnova-menu-item-danger"><Flag size={14} /> Report Post</button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {post.archived && (
              <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-warning">
                <Archive size={13} /> Archived
              </div>
            )}

            {(post.caption || post.content) && (
              <div className="space-y-3">
                {post.caption && <p className="text-lg font-black text-text-main leading-snug">{post.caption}</p>}
                {post.content && <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{post.content}</p>}
              </div>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {safeArray<string>(post.tags).map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">#{tag}</span>)}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-card-border">
              <button onClick={toggleThreadLike} className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-widest', post.isLiked ? 'text-red-500' : 'text-text-secondary hover:text-red-500')}>
                <Heart size={18} /> {post.likes}
              </button>
              <div className="flex items-center gap-2 text-text-secondary text-xs font-black uppercase tracking-widest">
                <MessageSquare size={18} /> {post.comments}
              </div>
              <button onClick={toggleThreadSave} className={cn('ml-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest', post.isSaved ? 'text-accent' : 'text-text-secondary hover:text-accent')}>
                <Bookmark size={18} /> {post.isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </article>

        <section className="bg-card border border-card-border rounded-[2rem] overflow-hidden flex flex-col min-h-[560px]">
          <div className="p-5 border-b border-card-border">
            <h2 className="text-sm font-black uppercase tracking-widest text-text-main">Comments</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40 mt-1">Thread for this post</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-app-container/30">
            {comments.length === 0 ? (
              <div className="h-full min-h-64 flex items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">No comments yet.</p>
              </div>
            ) : (
              <>
                {comments.map(comment => (
                  <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <img src={comment.author.avatar} alt={comment.author.name} className="w-9 h-9 rounded-xl object-cover border border-card-border" />
                    <div className="min-w-0 flex-1 rounded-2xl bg-card border border-card-border p-4">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-main truncate">{comment.author.name}</p>
                        <VerifiedBadge verified={comment.author.verified} size={13} />
                        <span className="ml-auto text-[8px] font-bold uppercase tracking-widest text-text-secondary/40">{comment.timestamp}</span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </motion.div>
                ))}
                {hasMoreComments && (
                  <button
                    onClick={loadMoreComments}
                    disabled={isLoadingMoreComments}
                    className="w-full h-11 rounded-2xl border border-card-border bg-card text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoadingMoreComments && <Loader2 size={14} className="animate-spin" />}
                    {isLoadingMoreComments ? 'Loading...' : 'Load more comments'}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="p-4 border-t border-card-border bg-card">
            <div className="flex items-end gap-3">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Write a comment..."
                className="flex-1 min-h-12 max-h-32 resize-none rounded-2xl bg-surface-muted border border-card-border px-4 py-3 text-sm outline-none focus:border-accent/50"
              />
              <button
                onClick={submitComment}
                disabled={isCommenting || !commentText.trim()}
                className={cn('h-12 w-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center disabled:opacity-50', isCommenting && 'cursor-wait')}
              >
                {isCommenting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
      <AnimatePresence>
        {post && isEditOpen && (
          <PostEditModal
            post={post}
            onClose={() => setIsEditOpen(false)}
            onSave={async (updates) => {
              const ok = await updatePost(post.id, updates);
              if (ok) setPost(current => current ? { ...current, ...updates, editedAt: new Date().toISOString() } : current);
              return ok;
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {post && isReportOpen && (
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
    </>
  );
}
