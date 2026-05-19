import { track } from '@vercel/analytics';
import { isSupabaseConfigured, supabase } from './supabase';
import { canUseAnalyticsFromStorage } from '../hooks/useCookieConsent';

type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function trackBetaEvent(
  userId: string | undefined | null,
  eventType: string,
  metadata: AnalyticsMetadata = {},
  entityId?: string | null
) {
  if (!isSupabaseConfigured() || !userId || !eventType) return;
  if (!canUseAnalyticsFromStorage()) return;

  const cleanMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  );

  if (typeof window !== 'undefined') {
    try {
      const vercelMetadata = Object.fromEntries(
        Object.entries(cleanMetadata).filter(([, value]) => (
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ))
      ) as Record<string, string | number | boolean>;
      track(eventType, {
        ...vercelMetadata,
        route: window.location.pathname
      });
    } catch (error) {
      console.warn('Vercel analytics event skipped:', eventType, error);
    }
  }

  try {
    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId,
      event_type: eventType,
      entity_id: entityId && uuidPattern.test(entityId) ? entityId : null,
      metadata: {
        ...cleanMetadata,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        timestamp: new Date().toISOString()
      }
    });

    if (error) throw error;
  } catch (error) {
    console.warn('Beta analytics event skipped:', eventType, error);
  }
}
