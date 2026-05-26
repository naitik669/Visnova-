import { Eye, UserPen } from 'lucide-react';
import type { VisionTeamRole } from '../../types';
import { canEditBoard } from '../../lib/visionTeams';

export function BoardPermissionBanner({ role }: { role?: VisionTeamRole | null }) {
  if (!role) return null;
  const editable = canEditBoard(role);
  return (
    <div className="absolute left-1/2 top-4 z-[90] -translate-x-1/2 rounded-full border border-card-border bg-card/95 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary shadow-xl backdrop-blur">
      <span className="flex items-center gap-2">
        {editable ? <UserPen size={13} className="text-accent" /> : <Eye size={13} className="text-accent" />}
        {editable ? `${role} access` : 'View-only access'}
      </span>
    </div>
  );
}
