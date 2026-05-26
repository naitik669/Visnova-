import { MoreHorizontal, Shield, Trash2 } from 'lucide-react';
import type { VisionTeamMember, VisionTeamRole } from '../../types';
import { cn } from '../../lib/utils';

const roleTone: Record<VisionTeamRole, string> = {
  owner: 'bg-accent text-accent-contrast',
  admin: 'bg-warning/15 text-warning',
  editor: 'bg-success/15 text-success',
  viewer: 'bg-surface-muted text-text-secondary'
};

export function TeamMembersPanel({
  members,
  currentRole,
  onRoleChange,
  onRemove
}: {
  members: VisionTeamMember[];
  currentRole?: VisionTeamRole | null;
  onRoleChange: (member: VisionTeamMember, role: Exclude<VisionTeamRole, 'owner'>) => void;
  onRemove: (member: VisionTeamMember) => void;
}) {
  const canManage = currentRole === 'owner' || currentRole === 'admin';
  return (
    <div className="space-y-3">
      {members.map(member => {
        const name = member.profile?.displayName || member.profile?.fullName || 'Collaborator';
        const avatar = member.profile?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${member.userId}`;
        const canEditMember = canManage && member.role !== 'owner';
        return (
          <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-card-border bg-bg-base p-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={avatar} alt={name} className="h-10 w-10 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-text-main">{name}</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
                  @{member.profile?.username || 'visnova'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn('rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest', roleTone[member.role])}>
                {member.role}
              </span>
              {canEditMember ? (
                <>
                  <select
                    value={member.role}
                    onChange={(event) => onRoleChange(member, event.target.value as Exclude<VisionTeamRole, 'owner'>)}
                    className="h-9 rounded-xl border border-card-border bg-card px-2 text-[10px] font-bold text-text-main outline-none"
                    aria-label={`Change ${name}'s role`}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemove(member)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-card-border text-text-secondary hover:border-danger/40 hover:text-danger"
                    aria-label={`Remove ${name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-xl text-text-secondary/35">
                  {member.role === 'owner' ? <Shield size={15} /> : <MoreHorizontal size={15} />}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {members.length === 0 && (
        <div className="rounded-2xl border border-dashed border-card-border p-8 text-center text-sm font-bold text-text-secondary">
          No team members yet.
        </div>
      )}
    </div>
  );
}
