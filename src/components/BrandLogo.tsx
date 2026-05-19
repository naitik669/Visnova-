import { useId } from 'react';
import { cn } from '../lib/utils';

type BrandLogoProps = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className, title = 'VisNova' }: BrandLogoProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `visnova-logo-gradient-${id}`;
  const edgeId = `visnova-logo-edge-${id}`;

  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="88" y1="58" x2="418" y2="450" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent) 62%, white)" />
          <stop offset="0.58" stopColor="var(--accent)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--accent) 68%, black)" />
        </linearGradient>
        <linearGradient id={edgeId} x1="88" y1="58" x2="398" y2="434" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect x="44" y="36" width="424" height="424" rx="96" fill={`url(#${gradientId})`} />
      <rect x="54" y="46" width="404" height="404" rx="88" fill="none" stroke={`url(#${edgeId})`} strokeWidth="10" />
      <g transform="translate(2 8)">
        <path d="M126 144h82l67 158 72-158h76L309 378h-67L126 144Z" fill="var(--accent-contrast)" />
        <path
          d="M113 326c60 37 181 16 269-50 66-50 80-96 56-114"
          fill="none"
          stroke="var(--accent-contrast)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M119 327c54 27 151 11 235-40"
          fill="none"
          stroke="color-mix(in srgb, var(--accent) 70%, black)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.42"
        />
      </g>
      <path
        d="M410 98c7 28 14 35 42 42-28 7-35 14-42 42-7-28-14-35-42-42 28-7 35-14 42-42Z"
        fill="var(--accent-contrast)"
      />
    </svg>
  );
}
