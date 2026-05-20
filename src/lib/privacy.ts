import {
  canUsePersonalizationFromStorage,
  canUseResourceRecommendationsFromStorage
} from '../hooks/useCookieConsent';
import { getAppPreferences, normalizeVisibility } from './appPreferences';

type RecommendationCandidate = {
  type?: string | null;
  sourceType?: string | null;
  noteType?: string | null;
  visibility?: string | null;
};

const PRIVATE_SOURCE_TYPES = new Set([
  'message',
  'messages',
  'journal',
  'journal_entry',
  'private_journal',
  'note',
  'private_note',
  'progress_log',
  'private_log',
  'private_progress_log'
]);

export const canUseForRecommendations = (entity: RecommendationCandidate | null | undefined) => {
  if (!entity) return false;
  const prefs = getAppPreferences();
  if (!prefs.personalizedRecommendations) return false;
  if (!canUsePersonalizationFromStorage() || !canUseResourceRecommendationsFromStorage()) return false;

  const source = String(entity.sourceType || entity.type || '').toLowerCase();
  const noteType = String(entity.noteType || '').toLowerCase();
  if (PRIVATE_SOURCE_TYPES.has(source) || PRIVATE_SOURCE_TYPES.has(noteType)) return false;
  if (normalizeVisibility(entity.visibility) === 'private') return false;

  return true;
};

export const isPrivateWorkspaceContent = (entity: RecommendationCandidate | null | undefined) => {
  if (!entity) return true;
  const source = String(entity.sourceType || entity.type || '').toLowerCase();
  return normalizeVisibility(entity.visibility) === 'private' || PRIVATE_SOURCE_TYPES.has(source);
};
