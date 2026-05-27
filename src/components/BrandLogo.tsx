import { cn } from '../lib/utils';

type BrandLogoProps = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className, title = 'VisNova' }: BrandLogoProps) {
  return (
    <img
      src="/visnova-logo.png"
      alt={title}
      className={cn('shrink-0 object-contain', className)}
      draggable={false}
    />
  );
}
