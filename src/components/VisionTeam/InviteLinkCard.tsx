import { Copy, Link as LinkIcon, RotateCcw } from 'lucide-react';
import type { VisionTeamInvite } from '../../types';
import { buildVisionTeamInviteUrl } from '../../lib/visionTeams';

export function InviteLinkCard({
  invite,
  onCopy,
  onRevoke
}: {
  invite: VisionTeamInvite;
  onCopy: (url: string) => void;
  onRevoke: (inviteId: string) => void;
}) {
  const url = buildVisionTeamInviteUrl(invite.inviteToken);
  return (
    <div className="rounded-2xl border border-card-border bg-bg-base p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">{invite.role} link</p>
          <p className="mt-1 truncate text-xs font-bold text-text-secondary/70">{url}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-text-secondary/40">
            {invite.expiresAt ? `Expires ${new Date(invite.expiresAt).toLocaleDateString()}` : 'No expiry'} · {invite.usedCount}{invite.maxUses ? `/${invite.maxUses}` : ''} used
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(url)}
            className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-contrast"
            aria-label="Copy invite link"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            onClick={() => onRevoke(invite.id)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-card-border text-text-secondary hover:border-danger/40 hover:text-danger"
            aria-label="Revoke invite link"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-text-secondary/45">
        <LinkIcon size={12} />
        Login required
      </div>
    </div>
  );
}
