-- Stabilize VisNova's core prototype contract without dropping user data.

-- Profiles: username, onboarding, avatar, verification, and vitals contract.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS main_goal text,
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS focus integer DEFAULT 85,
  ADD COLUMN IF NOT EXISTS energy integer DEFAULT 72,
  ADD COLUMN IF NOT EXISTS mood integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS sleep integer DEFAULT 64,
  ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_reason text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_id_auth_users_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (LOWER(username))
WHERE username IS NOT NULL AND username <> '';

CREATE OR REPLACE FUNCTION public.is_username_available(candidate_username text, current_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE lower(p.username) = lower(trim(candidate_username))
      AND (current_user_id IS NULL OR p.id <> current_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_user_verification_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'authenticated'
    AND auth.uid() = NEW.id
    AND (
      NEW.verified IS DISTINCT FROM OLD.verified OR
      NEW.verified_reason IS DISTINCT FROM OLD.verified_reason OR
      NEW.verified_at IS DISTINCT FROM OLD.verified_at
    )
  THEN
    RAISE EXCEPTION 'Verification can only be changed by an admin.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_verification_changes_trigger ON public.profiles;
CREATE TRIGGER prevent_user_verification_changes_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_verification_changes();

-- Notes: standardize Library storage to Vault while keeping UI-compatible reads.
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS journal_date date,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

ALTER TABLE public.notes ALTER COLUMN note_type SET DEFAULT 'vault';
UPDATE public.notes SET note_type = 'vault' WHERE note_type = 'library';
CREATE INDEX IF NOT EXISTS idx_notes_user_type_journal_date ON public.notes(user_id, note_type, journal_date);

-- Dashboard and visions.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sub_tasks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS stats jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text,
  description text,
  xp integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activities_select_own ON public.activities;
CREATE POLICY activities_select_own ON public.activities
FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS activities_insert_own ON public.activities;
CREATE POLICY activities_insert_own ON public.activities
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Communities route should never fail because the tables are missing.
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_official boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communities_select_authenticated ON public.communities;
CREATE POLICY communities_select_authenticated ON public.communities
FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS communities_insert_own ON public.communities;
CREATE POLICY communities_insert_own ON public.communities
FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS communities_update_own ON public.communities;
CREATE POLICY communities_update_own ON public.communities
FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS communities_delete_own ON public.communities;
CREATE POLICY communities_delete_own ON public.communities
FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS community_members_select_authenticated ON public.community_members;
CREATE POLICY community_members_select_authenticated ON public.community_members
FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS community_members_insert_self ON public.community_members;
CREATE POLICY community_members_insert_self ON public.community_members
FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS community_members_delete_self ON public.community_members;
CREATE POLICY community_members_delete_self ON public.community_members
FOR DELETE USING (auth.uid() = user_id);

INSERT INTO public.communities (name, description, category, is_official)
VALUES ('VisNova', 'The official VisNova community for progress, questions, and shared wins.', 'official', true)
ON CONFLICT DO NOTHING;

-- Circle/follow security.
CREATE TABLE IF NOT EXISTS public.user_circles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  circle_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  relation_type text DEFAULT 'friend' CHECK (relation_type IN ('friend', 'close_friend', 'collaborator')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, circle_user_id)
);

ALTER TABLE public.user_circles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_circles_select_own ON public.user_circles;
CREATE POLICY user_circles_select_own ON public.user_circles
FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_circles_insert_own ON public.user_circles;
CREATE POLICY user_circles_insert_own ON public.user_circles
FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() <> circle_user_id);
DROP POLICY IF EXISTS user_circles_update_own ON public.user_circles;
CREATE POLICY user_circles_update_own ON public.user_circles
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND auth.uid() <> circle_user_id);
DROP POLICY IF EXISTS user_circles_delete_own ON public.user_circles;
CREATE POLICY user_circles_delete_own ON public.user_circles
FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follows_select_public ON public.follows;
DROP POLICY IF EXISTS follows_insert_own ON public.follows;
DROP POLICY IF EXISTS follows_delete_own ON public.follows;
DROP POLICY IF EXISTS follows_select_authenticated ON public.follows;
CREATE POLICY follows_select_authenticated ON public.follows
FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS follows_insert_self ON public.follows;
CREATE POLICY follows_insert_self ON public.follows
FOR INSERT WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
DROP POLICY IF EXISTS follows_delete_self ON public.follows;
CREATE POLICY follows_delete_self ON public.follows
FOR DELETE USING (auth.uid() = follower_id);

-- Storage buckets and path-scoped policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('post-images', 'post-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('note-audio', 'note-audio', true, 26214400, ARRAY[
    'audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a',
    'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg',
    'application/ogg'
  ])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS avatars_insert_own_folder ON storage.objects;
CREATE POLICY avatars_insert_own_folder ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS avatars_update_own_folder ON storage.objects;
CREATE POLICY avatars_update_own_folder ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS avatars_delete_own_folder ON storage.objects;
CREATE POLICY avatars_delete_own_folder ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS post_images_public_read ON storage.objects;
CREATE POLICY post_images_public_read ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');
DROP POLICY IF EXISTS post_images_insert_own_folder ON storage.objects;
CREATE POLICY post_images_insert_own_folder ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS post_images_update_own_folder ON storage.objects;
CREATE POLICY post_images_update_own_folder ON storage.objects
FOR UPDATE USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS post_images_delete_own_folder ON storage.objects;
CREATE POLICY post_images_delete_own_folder ON storage.objects
FOR DELETE USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS note_audio_public_read ON storage.objects;
CREATE POLICY note_audio_public_read ON storage.objects
FOR SELECT USING (bucket_id = 'note-audio');
DROP POLICY IF EXISTS note_audio_insert_own_folder ON storage.objects;
CREATE POLICY note_audio_insert_own_folder ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS note_audio_update_own_folder ON storage.objects;
CREATE POLICY note_audio_update_own_folder ON storage.objects
FOR UPDATE USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS note_audio_delete_own_folder ON storage.objects;
CREATE POLICY note_audio_delete_own_folder ON storage.objects
FOR DELETE USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
