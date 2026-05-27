import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
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
        <div className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[250] flex max-h-[min(74dvh,36rem)] flex-col gap-4 overflow-y-auto rounded-[1.75rem] border border-card-border bg-card p-4 shadow-2xl shadow-accent/10 sm:flex-row sm:items-center sm:pr-12 lg:bottom-4 lg:left-auto lg:right-4 lg:w-[680px]">
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
              <div className="flex items-center gap-3 pr-10 sm:pr-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent sm:hidden">
                  <Cookie size={18} />
                </span>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Cookie choices</p>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-text-main">
                We use essential cookies/storage to keep VisNova working. You control optional analytics and personalization. Private messages, journals, notes, and private logs are never used for recommendations.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={acceptAll}
              className="col-span-2 h-11 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-sm shadow-accent/20 sm:col-span-1 sm:h-10"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className="col-span-2 h-11 rounded-xl border border-card-border bg-surface-muted px-4 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main sm:col-span-1 sm:h-10 sm:bg-card"
            >
              Manage choices
            </button>
            <Link to="/cookie-policy" className="inline-flex h-10 items-center justify-center rounded-xl px-2 text-[10px] font-black uppercase tracking-widest text-accent sm:justify-start sm:px-3">
              Cookie policy
            </Link>
            <Link to="/privacy-policy" className="inline-flex h-10 items-center justify-center rounded-xl px-2 text-[10px] font-black uppercase tracking-widest text-accent sm:justify-start sm:px-3">
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
