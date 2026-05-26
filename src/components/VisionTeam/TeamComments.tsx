import { Send } from 'lucide-react';
import { useState } from 'react';
import type { VisionTeamComment, VisionTeamRole } from '../../types';

export function TeamComments({
  comments,
  role,
  onSubmit
}: {
  comments: VisionTeamComment[];
  role?: VisionTeamRole | null;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const canWrite = !!role;

  const submit = async () => {
    const text = message.trim();
    if (!text || sending || !canWrite) return;
    setSending(true);
    try {
      await onSubmit(text);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit();
            }}
            placeholder="Comment on this Vision Team..."
            className="h-12 min-w-0 flex-1 rounded-2xl border border-card-border bg-bg-base px-4 text-sm font-bold text-text-main outline-none focus:border-accent/50"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!message.trim() || sending}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-contrast disabled:opacity-50"
            aria-label="Send team comment"
          >
            <Send size={17} />
          </button>
        </div>
      )}

      {comments.map(comment => (
        <div key={comment.id} className="rounded-2xl border border-card-border bg-bg-base p-4">
          <div className="flex items-start gap-3">
            <img
              src={comment.author?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${comment.userId}`}
              alt={comment.author?.name || 'Collaborator'}
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black text-text-main">{comment.author?.name || 'Collaborator'}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/40">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-text-secondary">{comment.message}</p>
            </div>
          </div>
        </div>
      ))}
      {comments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-card-border p-8 text-center text-sm font-bold text-text-secondary">
          No comments yet.
        </div>
      )}
    </div>
  );
}
