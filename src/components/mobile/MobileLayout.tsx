import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type MobilePageProps = {
  children: ReactNode;
  className?: string;
};

type MobileSectionProps = {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

type MobileEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function MobilePage({ children, className }: MobilePageProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[480px] flex-col gap-4 overflow-x-clip lg:hidden", className)}>
      {children}
    </div>
  );
}

export function MobileSection({
  eyebrow,
  title,
  action,
  children,
  className,
  contentClassName,
}: MobileSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.75rem] border border-card-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      {(eyebrow || title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary/60">
                {eyebrow}
              </p>
            )}
            {title && <h3 className="mt-1 text-lg font-black leading-tight text-text-main">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function MobilePrimaryAction({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-accent px-4 text-[11px] font-black uppercase tracking-widest text-accent-contrast shadow-xl shadow-accent/20 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function MobileEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: MobileEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-56 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-card-border bg-card p-5 text-center shadow-sm",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          {icon}
        </div>
      )}
      <h3 className="text-base font-black leading-tight text-text-main">{title}</h3>
      <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-text-secondary/70">{description}</p>
      {action && <div className="mt-5 w-full max-w-xs">{action}</div>}
    </div>
  );
}
