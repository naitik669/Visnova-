import { useCallback, useEffect, useMemo, useState } from 'react';

export const COOKIE_CONSENT_KEY = 'visnova_cookie_consent';
export const COOKIE_CONSENT_EVENT = 'visnova:cookie-consent-changed';
const COOKIE_CONSENT_VERSION = '1.0';

export type CookieConsent = {
  version: string;
  essential: true;
  analytics: boolean;
  personalization: boolean;
  resourceRecommendations: boolean;
  createdAt: string;
  updatedAt: string;
};

const createConsent = (updates: Partial<Omit<CookieConsent, 'essential' | 'createdAt' | 'updatedAt' | 'version'>> = {}): CookieConsent => {
  const now = new Date().toISOString();
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    analytics: false,
    personalization: false,
    resourceRecommendations: false,
    ...updates,
    createdAt: now,
    updatedAt: now
  };
};

const normalizeConsent = (value: unknown): CookieConsent | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<CookieConsent>;
  const now = new Date().toISOString();
  return {
    version: typeof raw.version === 'string' ? raw.version : COOKIE_CONSENT_VERSION,
    essential: true,
    analytics: raw.analytics === true,
    personalization: raw.personalization === true,
    resourceRecommendations: raw.resourceRecommendations === true,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now
  };
};

export const readCookieConsent = (): CookieConsent | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return raw ? normalizeConsent(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const writeCookieConsent = (next: CookieConsent) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: next }));
};

export const canUseAnalyticsFromStorage = () => readCookieConsent()?.analytics === true;
export const canUsePersonalizationFromStorage = () => readCookieConsent()?.personalization === true;
export const canUseResourceRecommendationsFromStorage = () => readCookieConsent()?.resourceRecommendations === true;

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readCookieConsent());
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const syncConsent = () => setConsent(readCookieConsent());
    const onConsentChange = (event: Event) => {
      const next = normalizeConsent((event as CustomEvent).detail);
      setConsent(next || readCookieConsent());
    };

    window.addEventListener('storage', syncConsent);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    return () => {
      window.removeEventListener('storage', syncConsent);
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    };
  }, []);

  const saveConsent = useCallback((partialConsent: Partial<Pick<CookieConsent, 'analytics' | 'personalization' | 'resourceRecommendations'>>) => {
    const existing = readCookieConsent();
    const now = new Date().toISOString();
    const next: CookieConsent = {
      ...(existing || createConsent()),
      ...partialConsent,
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    writeCookieConsent(next);
    setConsent(next);
    setPreferencesOpen(false);
    return next;
  }, []);

  const acceptAll = useCallback(() => saveConsent({
    analytics: true,
    personalization: true,
    resourceRecommendations: true
  }), [saveConsent]);

  const rejectOptional = useCallback(() => saveConsent({
    analytics: false,
    personalization: false,
    resourceRecommendations: false
  }), [saveConsent]);

  return useMemo(() => ({
    consent,
    hasConsentChoice: Boolean(consent),
    acceptAll,
    rejectOptional,
    saveConsent,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
    preferencesOpen,
    canUseAnalytics: consent?.analytics === true,
    canUsePersonalization: consent?.personalization === true,
    canUseResourceRecommendations: consent?.resourceRecommendations === true
  }), [acceptAll, consent, preferencesOpen, rejectOptional, saveConsent]);
}
