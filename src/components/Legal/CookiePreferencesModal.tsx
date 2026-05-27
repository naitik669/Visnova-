import { useEffect, useState } from 'react';
import { ShieldCheck, MessageCircleOff } from 'lucide-react';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { useCookieConsent } from '../../hooks/useCookieConsent';

type CookiePreferencesModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

function ToggleRow({
  title,
  description,
  checked,
  onChange
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex min-h-[5.5rem] w-full items-center justify-between gap-4 rounded-2xl border border-card-border bg-card p-4 text-left transition hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-text-main">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-relaxed text-text-secondary">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-surface-muted'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

export function CookiePreferencesModal({ open, onClose, onSaved }: CookiePreferencesModalProps) {
  const { consent, saveConsent, acceptAll, rejectOptional } = useCookieConsent();
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [resourceRecommendations, setResourceRecommendations] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAnalytics(consent?.analytics === true);
    setPersonalization(consent?.personalization === true);
    setResourceRecommendations(consent?.resourceRecommendations === true);
  }, [consent, open]);

  const finish = () => {
    onSaved?.();
    onClose();
  };

  const handleSave = () => {
    saveConsent({ analytics, personalization, resourceRecommendations });
    finish();
  };

  const handleAcceptAll = () => {
    acceptAll();
    finish();
  };

  const handleRejectOptional = () => {
    rejectOptional();
    finish();
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      size="lg"
      title="Cookie Settings"
      subtitle="Essential storage stays on for login, security, and core app functionality. Optional choices are yours."
      footer={
        <>
          <button type="button" onClick={handleSave} className="h-11 w-full rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-sm shadow-accent/20 sm:w-auto">
            Save choices
          </button>
          <button type="button" onClick={handleAcceptAll} className="h-11 w-full rounded-2xl border border-accent/30 bg-accent/10 px-5 text-[10px] font-black uppercase tracking-widest text-accent sm:w-auto">
            Accept all
          </button>
          <button type="button" onClick={handleRejectOptional} className="h-11 w-full rounded-2xl border border-card-border bg-card px-5 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main sm:w-auto">
            Reject optional
          </button>
        </>
      }
    >
      <div className="space-y-4 bg-app-container p-4 pb-6 sm:p-6">
        <div className="rounded-2xl border border-card-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-text-main">Essential cookies/storage</h3>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">Always active</span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-text-secondary">
                Required for login, security, session management, and core app functionality.
              </p>
            </div>
          </div>
        </div>

        <ToggleRow
          title="Analytics"
          description="Helps us understand app usage, performance, bugs, and beta experience. We do not collect private content inside analytics."
          checked={analytics}
          onChange={setAnalytics}
        />
        <ToggleRow
          title="Personalization"
          description="Helps VisNova remember your preferences and personalize your app experience."
          checked={personalization}
          onChange={setPersonalization}
        />
        <ToggleRow
          title="Resource recommendations"
          description="Helps suggest useful resources/products from allowed interests, public or Circle goals, saved resources, and store activity."
          checked={resourceRecommendations}
          onChange={setResourceRecommendations}
        />

        <div className="rounded-2xl border border-card-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <MessageCircleOff size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-text-main">Private workspace content</h3>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">Never used</span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-text-secondary">
                Private messages, private journals, private notes, and private progress logs are never used for recommendations or product personalization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}
