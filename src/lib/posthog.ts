import { canUseAnalyticsFromStorage } from '../hooks/useCookieConsent';

type PostHogClient = typeof import('posthog-js').default;
type PostHogProperties = Record<string, string | number | boolean | null | undefined>;

const posthogToken = import.meta.env.VITE_POSTHOG_TOKEN;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const posthogReplayEnabled = import.meta.env.VITE_POSTHOG_SESSION_REPLAY === 'true';

let initialized = false;
let identifiedUserId: string | null = null;
let posthogPromise: Promise<PostHogClient | null> | null = null;

export const isPostHogConfigured = () => Boolean(posthogToken);

async function getPostHogClient() {
  if (typeof window === 'undefined' || !isPostHogConfigured()) return null;

  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then((module) => module.default);
  }

  const posthog = await posthogPromise;

  if (!initialized) {
    posthog.init(posthogToken, {
      api_host: posthogHost,
      defaults: '2026-01-30',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: !posthogReplayEnabled,
      opt_out_capturing_by_default: !canUseAnalyticsFromStorage(),
      loaded: (client) => {
        if (canUseAnalyticsFromStorage()) {
          client.opt_in_capturing();
        } else {
          client.opt_out_capturing();
        }
      }
    });
    initialized = true;
  }

  return posthog;
}

export function initPostHog() {
  void getPostHogClient();
}

export function syncPostHogConsent(canUseAnalytics: boolean) {
  void getPostHogClient().then((posthog) => {
    if (!posthog) return;

    if (canUseAnalytics) {
      posthog.opt_in_capturing();
      return;
    }

    posthog.opt_out_capturing();
    identifiedUserId = null;
  });
}

export function identifyPostHogUser(
  userId: string | undefined | null,
  properties: PostHogProperties = {}
) {
  if (!userId || !canUseAnalyticsFromStorage()) return;

  const cleanProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null)
  );

  void getPostHogClient().then((posthog) => {
    if (!posthog) return;
    posthog.identify(userId, cleanProperties);
    identifiedUserId = userId;
  });
}

export function resetPostHogUser() {
  if (!initialized || typeof window === 'undefined') return;

  void getPostHogClient().then((posthog) => {
    posthog?.reset();
    identifiedUserId = null;
  });
}

export function capturePostHogEvent(eventName: string, properties: PostHogProperties = {}) {
  if (!eventName || !canUseAnalyticsFromStorage()) return;

  const cleanProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );

  void getPostHogClient().then((posthog) => {
    posthog?.capture(eventName, cleanProperties);
  });
}

export function capturePostHogPageview(path: string) {
  capturePostHogEvent('$pageview', {
    $current_url: typeof window !== 'undefined' ? window.location.href : path,
    path
  });
}

export function getIdentifiedPostHogUserId() {
  return identifiedUserId;
}
