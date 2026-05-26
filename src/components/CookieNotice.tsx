import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { CookiePreferencesModal } from './Legal/CookiePreferencesModal';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { VisNovaMotion } from './ui/VisNovaMotion';

export default function CookieNotice() {
  const {
    hasConsentChoice,
    acceptAll,
    rejectOptional,
    preferencesOpen,
    openPreferences,
    closePreferences
  } = useCookieConsent();

  return (
    <>
      {!hasConsentChoice && (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[250] flex flex-col gap-4 rounded-3xl border border-card-border bg-card p-4 pr-12 shadow-2xl shadow-accent/10 sm:flex-row sm:items-center lg:bottom-4 lg:left-auto lg:right-4 lg:w-[680px]">
          <button
            type="button"
            onClick={rejectOptional}
            aria-label="Close cookie notice"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-text-secondary transition hover:text-text-main"
          >
            <X size={16} />
          </button>
          <VisNovaMotion variant="cookie" className="hidden max-w-[130px] shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Cookie choices</p>
            <p className="text-sm font-semibold leading-relaxed text-text-main">
              We use essential cookies/storage to keep VisNova working. You control optional analytics and personalization. Private messages, journals, notes, and private logs are never used for recommendations.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className="h-10 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className="h-10 rounded-xl border border-card-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main"
            >
              Manage choices
            </button>
            <Link to="/cookie-policy" className="inline-flex h-10 items-center rounded-xl px-3 text-[10px] font-black uppercase tracking-widest text-accent">
              Cookie policy
            </Link>
            <Link to="/privacy-policy" className="inline-flex h-10 items-center rounded-xl px-3 text-[10px] font-black uppercase tracking-widest text-accent">
              Privacy
            </Link>
          </div>
          </div>
        </div>
      )}

      <CookiePreferencesModal open={preferencesOpen} onClose={closePreferences} />
    </>
  );
}
