import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  'https://us.i.posthog.com';

const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

let initialized = false;

const ANALYTICS_CONSENT_KEY = 'visnova_analytics_consent';
const MAX_STRING_PROPERTY_LENGTH = 120;

const BLOCKED_PROPERTY_KEYS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'code',
  'invite_token',
  'email',
  'phone',
  'message',
  'content',
  'body',
  'text',
  'journal',
  'note',
  'private_log',
  'private_message',
  'reflection',
  'description',
  'secret'
];

export function initAnalytics() {
  if (!ENABLE_ANALYTICS || !POSTHOG_KEY || initialized || typeof window === 'undefined') return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: !hasAnalyticsConsent(),
    loaded: (client) => {
      initialized = true;

      if (!hasAnalyticsConsent()) {
        client.opt_out_capturing();
      }

      if (import.meta.env.DEV) {
        client.debug();
      }
    }
  });
}

export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
) {
  if (!ENABLE_ANALYTICS || !initialized || !hasAnalyticsConsent()) return;

  posthog.capture(eventName, sanitizeAnalyticsProperties(properties));
}

export function identifyAnalyticsUser(
  userId: string | undefined | null,
  traits: Record<string, unknown> = {}
) {
  if (!ENABLE_ANALYTICS || !initialized || !userId || !hasAnalyticsConsent()) return;

  // Identify by internal Supabase user id only.
  // Do not send email/name unless explicitly approved later.
  posthog.identify(userId, sanitizeAnalyticsProperties(traits));
}

export function resetAnalyticsUser() {
  if (!ENABLE_ANALYTICS || !initialized) return;
  posthog.reset();
}

export function optInAnalytics() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'yes');
  if (!ENABLE_ANALYTICS || !initialized) return;
  posthog.opt_in_capturing();
}

export function optOutAnalytics() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ANALYTICS_CONSENT_KEY, 'no');
  if (!ENABLE_ANALYTICS || !initialized) return;
  posthog.opt_out_capturing();
}

export function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'yes';
}

export function trackPageView(pathname: string) {
  trackEvent('$pageview', {
    path: sanitizePath(pathname)
  });
}

export function sanitizeAnalyticsProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      const normalizedKey = key.toLowerCase();

      const blocked = BLOCKED_PROPERTY_KEYS.some((blockedKey) =>
        normalizedKey.includes(blockedKey)
      );

      if (blocked) return false;

      if (typeof value === 'string' && value.length > MAX_STRING_PROPERTY_LENGTH) {
        return false;
      }

      if (typeof value === 'object' && value !== null) {
        return false;
      }

      return true;
    })
  );
}

function sanitizePath(pathname: string) {
  return pathname
    .replace(/\/auth\/callback.*/, '/auth/callback')
    .replace(/\/join\/vision-team\/[^/]+/, '/join/vision-team/:token')
    .replace(/\/post\/[^/]+/, '/post/:postId')
    .replace(/\/profile\/[^/]+/, '/profile/:profileId')
    .replace(/\/store\/redirect\/[^/]+/, '/store/redirect/:productId');
}
