import { createClient } from '@supabase/supabase-js';
import { validateFile } from './security';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isUsableSupabaseUrl = (value?: string) => {
  if (!value || /your-project-url|undefined|null/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

const isUsableSupabaseKey = (value?: string) => {
  return !!value && !/your-|undefined|null/i.test(value) && (value.startsWith('sb_publishable_') || value.startsWith('eyJ'));
};

export const supabaseConfigError =
  !isUsableSupabaseUrl(envSupabaseUrl)
    ? 'Missing or invalid VITE_SUPABASE_URL.'
    : !isUsableSupabaseKey(envSupabaseAnonKey)
      ? 'Missing or invalid VITE_SUPABASE_ANON_KEY.'
      : '';

const supabaseUrl = supabaseConfigError ? 'https://missing-visnova-env.supabase.co' : envSupabaseUrl;
const supabaseAnonKey = supabaseConfigError ? 'missing-supabase-anon-key' : envSupabaseAnonKey;
const configuredAppUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_SITE_URL;

const isUsableAppUrl = (value?: string) => {
  if (!value || /your-|undefined|null/i.test(value)) return false;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.hostname.endsWith('.supabase.co') && !url.pathname.includes('/auth/v1');
  } catch {
    return false;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = () => {
  return !supabaseConfigError;
};

export const getAuthRedirectUrl = (path = '/auth/callback') => {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = (browserOrigin || (isUsableAppUrl(configuredAppUrl) ? configuredAppUrl : '')).replace(/\/$/, '');
  const nextPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${nextPath}`;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

const getCurrentUserId = async (currentUserId?: string) => {
  let userId = currentUserId;

  if (!userId) {
    const { data: { session } } = await withTimeout(supabase.auth.getSession(), 20000, 'Checking your session');
    userId = session?.user?.id;
  }

  if (!userId) {
    throw new Error('You must be signed in to upload files.');
  }

  return userId;
};

export const uploadMedia = async (file: File, bucket: string = 'post-images', currentUserId?: string) => {
  const userId = await getCurrentUserId(currentUserId);

  const { normalizedType, safeExt } = validateFile(file, ['image/png', 'image/jpeg', 'image/webp'], 10 * 1024 * 1024, 'image');
  const fileExt = safeExt || extensionForMime(normalizedType) || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${userId}/posts/${fileName}`;

  const { error } = await withTimeout(
    supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: normalizedType,
        upsert: false
      }),
    60000,
    'Media upload'
  );

  if (error) {
    console.error('Storage Upload Error:', error);
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error(`Image storage is not set up yet. Apply the latest Supabase migrations to create the ${bucket} bucket.`);
    }
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { publicUrl, filePath };
};

export const uploadAvatar = async (file: File, currentUserId?: string) => {
  const userId = await getCurrentUserId(currentUserId);
  const { normalizedType, safeExt } = validateFile(file, ['image/png', 'image/jpeg', 'image/webp'], 5 * 1024 * 1024, 'avatar');
  const fileExt = safeExt || extensionForMime(normalizedType) || 'jpg';
  const filePath = `${userId}/profile/avatar-${Date.now()}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: normalizedType,
        upsert: true
      }),
    60000,
    'Avatar upload'
  );

  if (error) {
    console.error('Avatar Upload Error:', error);
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error('Avatar storage is not set up yet. Apply the latest Supabase migrations to create the avatars bucket.');
    }
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { publicUrl, filePath };
};

export const uploadAudioNote = async (file: File, currentUserId?: string, noteId?: string) => {
  const userId = await getCurrentUserId(currentUserId);
  const rawType = (file.type || '').toLowerCase();
  const normalizedType = rawType.split(';')[0] || inferAudioTypeFromName(file.name);
  const allowedTypes = [
    'audio/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/ogg',
    'application/ogg'
  ];
  validateFile(file, allowedTypes, 25 * 1024 * 1024, 'audio note');

  const extensionByType: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'application/ogg': 'ogg'
  };
  const fileExt = (file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') : '') || extensionByType[normalizedType] || 'webm';
  const filePath = noteId
    ? `${userId}/notes/${noteId}/audio.${fileExt}`
    : `${userId}/audio/audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('note-audio')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: normalizedType,
        upsert: false
      }),
    60000,
    'Audio note upload'
  );

  if (error) {
    console.error('Audio Upload Error:', error);
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error('Audio storage is not set up yet. Apply the latest Supabase migrations to create the private note-audio bucket.');
    }
    throw new Error(`Audio upload failed: ${error.message}`);
  }

  const { data, error: signedError } = await supabase.storage
    .from('note-audio')
    .createSignedUrl(filePath, 3600);

  if (signedError) {
    console.error('Audio Signed URL Error:', signedError);
    throw new Error(`Audio upload succeeded, but playback setup failed: ${signedError.message}`);
  }

  return { signedUrl: data?.signedUrl || '', filePath };
};

export const getAudioNoteUrl = async (path: string) => {
  if (!path) return '';
  const { data, error } = await supabase.storage
    .from('note-audio')
    .createSignedUrl(path, 3600);

  if (error) {
    console.error('Audio Signed URL Error:', error);
    throw new Error(`Could not load audio note: ${error.message}`);
  }

  return data?.signedUrl || '';
};

export const uploadCapsuleImage = async (file: File, capsuleId: string, currentUserId?: string) => {
  const userId = await getCurrentUserId(currentUserId);
  const { normalizedType, safeExt } = validateFile(file, ['image/png', 'image/jpeg', 'image/webp'], 10 * 1024 * 1024, 'NovaCapsule image');

  const fileExt = safeExt || extensionForMime(normalizedType) || 'jpg';
  const filePath = `${userId}/${capsuleId}/image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('nova-capsules')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: normalizedType,
        upsert: false
      }),
    60000,
    'NovaCapsule image upload'
  );

  if (error) {
    console.error('NovaCapsule Upload Error:', error);
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error('NovaCapsule storage is not set up yet. Apply the latest Supabase migrations to create the private nova-capsules bucket.');
    }
    throw new Error(`NovaCapsule upload failed: ${error.message}`);
  }

  const { data, error: signedError } = await supabase.storage
    .from('nova-capsules')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  if (signedError) {
    console.error('NovaCapsule Signed URL Error:', signedError);
    throw new Error(`NovaCapsule upload succeeded, but preview setup failed: ${signedError.message}`);
  }

  return { signedUrl: data?.signedUrl || '', filePath };
};

export const getCapsuleImageUrl = async (path: string) => {
  if (!path) return '';
  const { data, error } = await supabase.storage
    .from('nova-capsules')
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error) {
    console.error('NovaCapsule Signed URL Error:', error);
    throw new Error(`Could not load NovaCapsule image: ${error.message}`);
  }

  return data?.signedUrl || '';
};

export const uploadVisionBoardImage = async (file: File, visionId: string, currentUserId?: string) => {
  const userId = await getCurrentUserId(currentUserId);
  const { normalizedType, safeExt } = validateFile(file, ['image/png', 'image/jpeg', 'image/webp'], 10 * 1024 * 1024, 'Vision Board image');

  const fileExt = safeExt || extensionForMime(normalizedType) || 'jpg';
  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .slice(0, 48) || 'image';
  const filePath = `${userId}/visions/${visionId}/${safeName}-${Date.now()}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('vision-board-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: normalizedType,
        upsert: false
      }),
    60000,
    'Vision Board image upload'
  );

  if (error) {
    console.error('Vision Board Upload Error:', error);
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error('Vision Board image storage is not set up yet. Apply the latest Supabase migrations.');
    }
    throw new Error(`Vision Board image upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('vision-board-images')
    .getPublicUrl(filePath);

  return { publicUrl, filePath };
};

export const uploadJournalImage = async (file: File, journalNoteId: string, currentUserId?: string) => {
  const userId = await getCurrentUserId(currentUserId);
  const { normalizedType, safeExt } = validateFile(file, ['image/png', 'image/jpeg', 'image/webp'], 10 * 1024 * 1024, 'Journal image');

  const fileExt = safeExt || extensionForMime(normalizedType) || 'jpg';
  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .slice(0, 48) || 'image';
  const filePath = `${userId}/journals/${journalNoteId}/${safeName}-${Date.now()}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('journal-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: normalizedType,
        upsert: false
      }),
    60000,
    'Journal image upload'
  );

  if (error) {
    console.error('Journal Upload Error:', error);
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error('Journal image storage is not configured. Apply the latest Supabase migrations.');
    }
    throw new Error(`Journal image upload failed: ${error.message}`);
  }

  const { data, error: signedError } = await supabase.storage
    .from('journal-images')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  if (signedError) {
    console.error('Journal Signed URL Error:', signedError);
    throw new Error(`Journal image upload succeeded, but preview setup failed: ${signedError.message}`);
  }

  return { signedUrl: data?.signedUrl || '', filePath };
};

const inferAudioTypeFromName = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'm4a') return 'audio/mp4';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
  if (ext === 'webm') return 'audio/webm';
  return '';
};

const extensionForMime = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return '';
};
