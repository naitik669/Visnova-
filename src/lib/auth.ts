import { isSupabaseConfigured, supabase } from './supabase';

export async function findExistingProfileByEmail(email: string) {
  if (!isSupabaseConfigured || !email.trim()) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,onboarded')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error) {
    console.warn('Profile pre-check failed:', error.message);
    return null;
  }

  return data;
}
