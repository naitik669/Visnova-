export type DefaultVisibility = 'private' | 'circle' | 'public';
type LegacyVisibility = DefaultVisibility | 'connections' | 'friends' | string | null | undefined;

export type ProfileVisibility = 'public' | 'circle' | 'minimal';
export type PermissionAudience = 'everyone' | 'circle' | 'none';

export type NotificationPreferences = {
  product: boolean;
  social: boolean;
  reminders: boolean;
  sound: boolean;
};

export type AppPreferences = {
  defaultVisibility: DefaultVisibility;
  progressLogVisibility: DefaultVisibility;
  profileVisibility: ProfileVisibility;
  messagePermissions: PermissionAudience;
  mentionPermissions: PermissionAudience;
  personalizedRecommendations: boolean;
  reduceMotion: boolean;
  compactCards: boolean;
  workspaceScale: 'compact' | 'comfortable';
  betaTips: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  product: true,
  social: true,
  reminders: true,
  sound: false
};

export const defaultAppPreferences: AppPreferences = {
  defaultVisibility: 'private',
  progressLogVisibility: 'private',
  profileVisibility: 'public',
  messagePermissions: 'circle',
  mentionPermissions: 'everyone',
  personalizedRecommendations: false,
  reduceMotion: false,
  compactCards: true,
  workspaceScale: 'compact',
  betaTips: true
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getNotificationPreferences = () =>
  readJson('visnova-notification-settings', defaultNotificationPreferences);

export const setNotificationPreferences = (value: NotificationPreferences) => {
  writeJson('visnova-notification-settings', value);
  window.dispatchEvent(new CustomEvent('visnova:preferences-changed'));
};

export const normalizeVisibility = (visibility: LegacyVisibility): DefaultVisibility => {
  if (visibility === 'public') return 'public';
  if (visibility === 'circle' || visibility === 'connections' || visibility === 'friends') return 'circle';
  return 'private';
};

export const getVisibilityLabel = (visibility: LegacyVisibility) => {
  const normalized = normalizeVisibility(visibility);
  if (normalized === 'public') return 'Public · Feed and profile';
  if (normalized === 'circle') return 'Circle · People you choose';
  return 'Private · Only you';
};

const normalizeProfileVisibility = (visibility: AppPreferences['profileVisibility'] | string | null | undefined): ProfileVisibility => {
  if (visibility === 'circle') return 'circle';
  if (visibility === 'minimal' || visibility === 'private') return 'minimal';
  return 'public';
};

const normalizePermissionAudience = (value: AppPreferences['messagePermissions'] | string | null | undefined): PermissionAudience => {
  if (value === 'everyone' || value === 'none') return value;
  return 'circle';
};

export const getAppPreferences = () => {
  const prefs = readJson('visnova-preference-settings', defaultAppPreferences);
  const workspaceScale = prefs.workspaceScale || (prefs.compactCards ? 'compact' : 'comfortable');
  return {
    ...prefs,
    compactCards: workspaceScale === 'compact',
    workspaceScale,
    defaultVisibility: normalizeVisibility(prefs.defaultVisibility),
    progressLogVisibility: normalizeVisibility(prefs.progressLogVisibility),
    profileVisibility: normalizeProfileVisibility(prefs.profileVisibility),
    messagePermissions: normalizePermissionAudience(prefs.messagePermissions),
    mentionPermissions: normalizePermissionAudience(prefs.mentionPermissions),
    personalizedRecommendations: prefs.personalizedRecommendations === true
  };
};

export const setAppPreferences = (value: AppPreferences) => {
  const workspaceScale = value.workspaceScale || (value.compactCards ? 'compact' : 'comfortable');
  const normalized = {
    ...value,
    compactCards: workspaceScale === 'compact',
    workspaceScale,
    defaultVisibility: normalizeVisibility(value.defaultVisibility),
    progressLogVisibility: normalizeVisibility(value.progressLogVisibility),
    profileVisibility: normalizeProfileVisibility(value.profileVisibility),
    messagePermissions: normalizePermissionAudience(value.messagePermissions),
    mentionPermissions: normalizePermissionAudience(value.mentionPermissions),
    personalizedRecommendations: value.personalizedRecommendations === true
  };
  writeJson('visnova-preference-settings', normalized);
  applyAppPreferences(normalized);
  window.dispatchEvent(new CustomEvent('visnova:preferences-changed'));
};

export const applyAppPreferences = (value: AppPreferences = getAppPreferences()) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.reduceMotion = value.reduceMotion ? 'true' : 'false';
  document.documentElement.dataset.uiDensity = value.workspaceScale || (value.compactCards ? 'compact' : 'comfortable');
  document.documentElement.dataset.compactCards = (value.workspaceScale === 'compact' || value.compactCards) ? 'true' : 'false';
  document.documentElement.dataset.betaTips = value.betaTips ? 'true' : 'false';
};

export const getDefaultVisibility = () => getAppPreferences().defaultVisibility;

export const toVisionVisibility = (visibility: LegacyVisibility): 'private' | 'circle' | 'public' =>
  normalizeVisibility(visibility);

export const toPostVisibility = (visibility: LegacyVisibility): 'private' | 'circle' | 'public' =>
  normalizeVisibility(visibility);

export const playInteractionSound = (kind: 'click' | 'success' | 'error' | 'info' | 'message' = 'click') => {
  if (typeof window === 'undefined') return;
  const prefs = getNotificationPreferences();
  if (!prefs.sound) return;

  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const frequency = {
      click: 420,
      success: 660,
      error: 180,
      info: 520,
      message: 740
    }[kind];

    oscillator.type = kind === 'error' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    if (kind === 'success' || kind === 'message') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.25, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'error' ? 0.035 : 0.025, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
    window.setTimeout(() => context.close().catch(() => undefined), 300);
  } catch {
    // Browsers may block audio until user interaction; silently ignore.
  }
};
