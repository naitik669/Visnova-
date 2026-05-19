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
      <path d="M110 150h91l72 162 73-162h83L309 389h-72L110 150Z" fill="var(--accent-contrast)" />
      <path
        d="M112 333c59 42 187 20 279-52 72-57 83-110 57-127"
        fill="none"
        stroke="var(--accent-contrast)"
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M112 333c54 30 154 16 244-41"
        fill="none"
        stroke="color-mix(in srgb, var(--accent) 70%, black)"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.62"
      />
      <path
        d="M422 98c8 35 15 42 50 50-35 8-42 15-50 50-8-35-15-42-50-50 35-8 42-15 50-50Z"
        fill="var(--accent-contrast)"
      />
    </svg>
  );
}
