import { useId } from 'react';
import { cn } from '../lib/utils';

type BrandLogoProps = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className, title = 'VisNova' }: BrandLogoProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `visnova-logo-gradient-${id}`;
  const shineId = `visnova-logo-shine-${id}`;

  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="96" y1="56" x2="424" y2="472" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent) 58%, white)" />
          <stop offset="0.55" stopColor="var(--accent)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--accent) 78%, black)" />
        </linearGradient>
        <radialGradient id={shineId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(166 96) rotate(56) scale(330 280)">
          <stop offset="0" stopColor="white" stopOpacity="0.42" />
          <stop offset="0.62" stopColor="white" stopOpacity="0.06" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="44" y="36" width="424" height="424" rx="96" fill={`url(#${gradientId})`} />
      <rect x="44" y="36" width="424" height="424" rx="96" fill={`url(#${shineId})`} />
      <g transform="translate(0 -2)">
        <path d="M122 150h86l68 154 69-154h79L310 381h-68L122 150Z" fill="var(--accent-contrast)" />
        <path
          d="M116 327c60 38 179 18 267-49 66-51 79-99 55-116"
          fill="none"
          stroke="var(--accent-contrast)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <path
          d="M121 328c53 27 148 13 232-38"
          fill="none"
          stroke="color-mix(in srgb, var(--accent) 70%, black)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.62"
        />
      </g>
      <path
        d="M414 106c7 29 13 35 42 42-29 7-35 13-42 42-7-29-13-35-42-42 29-7 35-13 42-42Z"
        fill="var(--accent-contrast)"
      />
    </svg>
  );
}
