import { BadgeCheck } from 'lucide-react';
import { cn } from '../lib/utils';

type VerifiedBadgeProps = {
  verified?: boolean | null;
  className?: string;
  size?: number;
};

export default function VerifiedBadge({ verified, className, size = 16 }: VerifiedBadgeProps) {
  if (!verified) return null;

  return (
    <span
      className={cn('inline-flex items-center text-accent align-middle', className)}
      title="Verified account"
      aria-label="Verified account"
    >
      <BadgeCheck size={size} className="text-accent drop-shadow-sm" />
    </span>
  );
}
