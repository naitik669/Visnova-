import { useId } from 'react';
import { cn } from '../lib/utils';

type BrandLogoProps = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className, title = 'VisNova' }: BrandLogoProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `visnova-logo-gradient-${id}`;
  const glowId = `visnova-logo-glow-${id}`;

  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="110" y1="78" x2="404" y2="430" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent) 38%, white)" />
          <stop offset="0.48" stopColor="color-mix(in srgb, var(--accent) 84%, white)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
        <radialGradient id={glowId} cx="38%" cy="20%" r="74%">
          <stop offset="0" stopColor="white" stopOpacity="0.36" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="44" y="44" width="424" height="424" rx="104" fill={`url(#${gradientId})`} />
      <rect x="44" y="44" width="424" height="424" rx="104" fill={`url(#${glowId})`} />
      <path
        d="M340 136A148 148 0 1 1 236 126"
        fill="none"
        stroke="var(--accent-contrast)"
        strokeWidth="48"
        strokeLinecap="butt"
      />
      <path
        d="M256 184c16 51 25 60 76 76-51 16-60 25-76 76-16-51-25-60-76-76 51-16 60-25 76-76Z"
        fill="var(--accent-contrast)"
      />
    </svg>
  );
}
