import { Link } from 'react-router-dom';
import { CookiePreferencesModal } from './Legal/CookiePreferencesModal';
import { useCookieConsent } from '../hooks/useCookieConsent';

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
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[250] rounded-3xl border border-[#E7DDFF] bg-white p-4 shadow-2xl shadow-[#8B5CF6]/10 lg:bottom-4 lg:left-auto lg:right-4 lg:w-[520px]">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B5CF6]">Cookie choices</p>
            <p className="text-sm font-semibold leading-relaxed text-[#2B1B48]">
              VisNova uses essential cookies/storage to keep the app secure and working. With your permission, we may also use analytics and personalization to improve the app and recommend useful resources for your goals. Private messages are never used for recommendations.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className="h-10 rounded-xl bg-[#8B5CF6] px-4 text-[10px] font-black uppercase tracking-widest text-white"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={rejectOptional}
              className="h-10 rounded-xl border border-[#E7DDFF] bg-[#F7F3FF] px-4 text-[10px] font-black uppercase tracking-widest text-[#2B1B48]"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={openPreferences}
              className="h-10 rounded-xl border border-[#E7DDFF] bg-white px-4 text-[10px] font-black uppercase tracking-widest text-[#7A6F91]"
            >
              Manage choices
            </button>
            <Link to="/cookie-policy" className="inline-flex h-10 items-center rounded-xl px-3 text-[10px] font-black uppercase tracking-widest text-[#8B5CF6]">
              Cookie policy
            </Link>
          </div>
        </div>
      )}

      <CookiePreferencesModal open={preferencesOpen} onClose={closePreferences} />
    </>
  );
}
