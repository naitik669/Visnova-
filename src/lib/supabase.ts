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

export const uploadMedia = async (file: File, bucket: string = 'post-images', currentUserId?: string) => {
  let userId = currentUserId;

  if (!userId) {
    const { data: { session } } = await withTimeout(supabase.auth.getSession(), 20000, 'Checking your session');
    userId = session?.user?.id;
  }

  if (!userId) {
    throw new Error('You must be signed in to upload images.');
  }

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
