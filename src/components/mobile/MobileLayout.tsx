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

export function MobilePage({ children, className }: MobilePageProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[480px] flex-col gap-4 lg:hidden", className)}>
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
    <section className={cn("rounded-[2rem] border border-card-border bg-card p-4 shadow-sm", className)}>
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
        "flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-accent px-4 text-[11px] font-black uppercase tracking-widest text-accent-contrast shadow-xl shadow-accent/20 active:scale-[0.99]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
