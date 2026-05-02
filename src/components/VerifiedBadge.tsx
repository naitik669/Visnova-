import { BadgeCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function VerifiedBadge({ verified, className }: { verified?: boolean | null; className?: string }) {
  if (!verified) return null;

  return (
    <span className={cn('inline-flex items-center text-accent align-middle', className)} title="Verified" aria-label="Verified">
      <BadgeCheck size={16} className="text-accent drop-shadow-sm" />
    </span>
  );
}
