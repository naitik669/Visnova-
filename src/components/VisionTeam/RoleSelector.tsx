import { Shield, UserPen, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { VisionTeamRole } from '../../types';

const roleMeta: Record<Exclude<VisionTeamRole, 'owner'>, { label: string; description: string; icon: typeof Eye }> = {
  viewer: { label: 'Viewer', description: 'Can view the board', icon: Eye },
  editor: { label: 'Editor', description: 'Can edit board items', icon: UserPen },
  admin: { label: 'Admin', description: 'Can edit and manage members', icon: Shield }
};

export function RoleSelector({
  value,
  onChange,
  compact = false
}: {
  value: Exclude<VisionTeamRole, 'owner'>;
  onChange: (role: Exclude<VisionTeamRole, 'owner'>) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
      {(Object.keys(roleMeta) as Exclude<VisionTeamRole, 'owner'>[]).map(role => {
        const Icon = roleMeta[role].icon;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={cn(
              'rounded-2xl border p-4 text-left transition-all',
              value === role
                ? 'border-accent bg-accent/10 text-text-main shadow-lg shadow-accent/10'
                : 'border-card-border bg-bg-base text-text-secondary hover:border-accent/40 hover:text-text-main'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon size={16} className={value === role ? 'text-accent' : 'text-text-secondary'} />
              <span className="text-[10px] font-black uppercase tracking-widest">{roleMeta[role].label}</span>
            </div>
            {!compact && <p className="mt-2 text-[10px] font-bold leading-relaxed opacity-60">{roleMeta[role].description}</p>}
          </button>
        );
      })}
    </div>
  );
}
