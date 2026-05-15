export type DefaultVisibility = 'private' | 'connections' | 'public';

export type NotificationPreferences = {
  product: boolean;
  social: boolean;
  reminders: boolean;
  sound: boolean;
};

export type AppPreferences = {
  defaultVisibility: DefaultVisibility;
  reduceMotion: boolean;
  compactCards: boolean;
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
  reduceMotion: false,
  compactCards: false,
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

export const getAppPreferences = () =>
  readJson('visnova-preference-settings', defaultAppPreferences);

export const setAppPreferences = (value: AppPreferences) => {
  writeJson('visnova-preference-settings', value);
  applyAppPreferences(value);
  window.dispatchEvent(new CustomEvent('visnova:preferences-changed'));
};

export const applyAppPreferences = (value: AppPreferences = getAppPreferences()) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.reduceMotion = value.reduceMotion ? 'true' : 'false';
  document.documentElement.dataset.compactCards = value.compactCards ? 'true' : 'false';
  document.documentElement.dataset.betaTips = value.betaTips ? 'true' : 'false';
};

export const getDefaultVisibility = () => getAppPreferences().defaultVisibility;

export const toVisionVisibility = (visibility: DefaultVisibility): 'private' | 'friends' | 'public' => {
  if (visibility === 'connections') return 'friends';
  return visibility;
};

export const toPostVisibility = (visibility: DefaultVisibility): 'private' | 'friends' | 'public' => {
  if (visibility === 'connections') return 'friends';
  return visibility;
};

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
