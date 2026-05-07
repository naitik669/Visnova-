import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configuredAppUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_SITE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'your-project-url';
};

export const getAuthRedirectUrl = (path = '/auth/callback') => {
  const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = (configuredAppUrl || fallbackUrl).replace(/\/$/, '');
  return `${baseUrl}${path}`;
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

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload PNG, JPEG, or WebP images.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size exceeds 10MB limit.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${userId}/posts/${fileName}`;

  const { error } = await withTimeout(
    supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      }),
    60000,
    'Media upload'
  );

  if (error) {
    console.error('Storage Upload Error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { publicUrl, filePath };
};

export const uploadAvatar = async (file: File, currentUserId?: string) => {
  const userId = await getCurrentUserId(currentUserId);
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported avatar type. Please upload PNG, JPEG, or WebP images.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar size exceeds 5MB limit.');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/profile/avatar-${Date.now()}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      }),
    60000,
    'Avatar upload'
  );

  if (error) {
    console.error('Avatar Upload Error:', error);
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { publicUrl, filePath };
};

export const uploadAudioNote = async (file: File, currentUserId?: string) => {
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
  if (!allowedTypes.includes(normalizedType)) {
    throw new Error('Unsupported audio type. Please upload WebM, MP3, MP4, WAV, or OGG audio.');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Audio note exceeds 25MB limit.');
  }

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
  const fileExt = file.name.includes('.') ? file.name.split('.').pop() : extensionByType[normalizedType] || 'webm';
  const filePath = `${userId}/notes/audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

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
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported image type. Please upload PNG, JPEG, or WebP images.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('NovaCapsule image exceeds 10MB limit.');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/${capsuleId}/image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

  const { error } = await withTimeout(
    supabase.storage
      .from('nova-capsules')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      }),
    60000,
    'NovaCapsule image upload'
  );

  if (error) {
    console.error('NovaCapsule Upload Error:', error);
    throw new Error(`NovaCapsule upload failed: ${error.message}`);
  }

  const { data } = await supabase.storage
    .from('nova-capsules')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

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
