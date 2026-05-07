-- Closed-beta blocker fixes for VisNova v2.
-- Safe to run on an existing project: no user data is dropped.

-- 1. Status posts must be accepted by the DB contract.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE public.posts
ADD CONSTRAINT posts_type_check
CHECK (type IN ('sprint', 'insight', 'milestone', 'update', 'achievement', 'status'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND constraint_name = 'posts_user_id_fkey'
  ) THEN
    ALTER TABLE public.posts
    ADD CONSTRAINT posts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
    NOT VALID;
  END IF;
END $$;

-- 2. Communities need the tables and columns used by CommunitySpaces.
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_unique
ON public.communities (slug)
WHERE slug IS NOT NULL;

UPDATE public.communities
SET slug = 'visnova',
    icon = COALESCE(icon, 'target'),
    color = COALESCE(color, '#7c3aed')
WHERE name = 'VisNova'
  AND (slug IS NULL OR slug = '')
  AND NOT EXISTS (
    SELECT 1
    FROM public.communities existing
    WHERE existing.slug = 'visnova'
      AND existing.id <> communities.id
  );

INSERT INTO public.communities (name, slug, description, category, icon, color, is_official)
VALUES (
  'VisNova',
  'visnova',
  'The official VisNova community for builders sharing progress, questions, and wins.',
  'builders',
  'target',
  '#7c3aed',
  true
)
ON CONFLICT (slug) DO UPDATE
SET icon = COALESCE(public.communities.icon, EXCLUDED.icon),
    color = COALESCE(public.communities.color, EXCLUDED.color),
    is_official = true;

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communities_select_authenticated ON public.communities;
CREATE POLICY communities_select_authenticated ON public.communities
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS communities_insert_own ON public.communities;
CREATE POLICY communities_insert_own ON public.communities
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS community_members_select_authenticated ON public.community_members;
CREATE POLICY community_members_select_authenticated ON public.community_members
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS community_members_insert_self ON public.community_members;
CREATE POLICY community_members_insert_self ON public.community_members
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_members_delete_self ON public.community_members;
CREATE POLICY community_members_delete_self ON public.community_members
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_members TO authenticated;

-- 3. Community threads and messages.
CREATE TABLE IF NOT EXISTS public.community_threads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text DEFAULT 'discussion' CHECK (kind IN ('discussion', 'achievement', 'question')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_thread_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.community_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_threads_community_id
ON public.community_threads (community_id);

CREATE INDEX IF NOT EXISTS idx_community_thread_messages_thread_id
ON public.community_thread_messages (thread_id);

ALTER TABLE public.community_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS threads_select ON public.community_threads;
DROP POLICY IF EXISTS threads_insert ON public.community_threads;
DROP POLICY IF EXISTS threads_update ON public.community_threads;
DROP POLICY IF EXISTS threads_delete ON public.community_threads;

CREATE POLICY threads_select
ON public.community_threads
FOR SELECT TO authenticated
USING (true);

CREATE POLICY threads_insert
ON public.community_threads
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY threads_update
ON public.community_threads
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY threads_delete
ON public.community_threads
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS messages_select ON public.community_thread_messages;
DROP POLICY IF EXISTS messages_insert ON public.community_thread_messages;
DROP POLICY IF EXISTS messages_update ON public.community_thread_messages;
DROP POLICY IF EXISTS messages_delete ON public.community_thread_messages;

CREATE POLICY messages_select
ON public.community_thread_messages
FOR SELECT TO authenticated
USING (true);

CREATE POLICY messages_insert
ON public.community_thread_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY messages_update
ON public.community_thread_messages
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY messages_delete
ON public.community_thread_messages
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_thread_messages TO authenticated;

-- 6. Replace the old verification trigger name with a single admin-safe guard.
DROP TRIGGER IF EXISTS prevent_user_verification_changes ON public.profiles;
DROP TRIGGER IF EXISTS prevent_user_verification_changes_trigger ON public.profiles;
DROP TRIGGER IF EXISTS protect_profile_verification_fields_trigger ON public.profiles;

CREATE OR REPLACE FUNCTION public.protect_profile_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND (
    NEW.verified IS DISTINCT FROM OLD.verified OR
    NEW.verified_reason IS DISTINCT FROM OLD.verified_reason OR
    NEW.verified_at IS DISTINCT FROM OLD.verified_at
  ) THEN
    RAISE EXCEPTION 'Verification fields can only be changed by an admin.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_verification_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_verification_fields();

-- 7. Audio notes are private user content.
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS audio_path text;

UPDATE storage.buckets
SET public = false
WHERE id = 'note-audio';

DROP POLICY IF EXISTS note_audio_public_read ON storage.objects;
DROP POLICY IF EXISTS "note_audio_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public read note audio" ON storage.objects;
DROP POLICY IF EXISTS note_audio_read_own_folder ON storage.objects;
CREATE POLICY note_audio_read_own_folder ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Public note/folder sharing needs public-note SELECT without edit rights.
DROP POLICY IF EXISTS notes_select_public ON public.notes;
CREATE POLICY notes_select_public
ON public.notes
FOR SELECT
USING (visibility = 'public');

-- 12. Remove stale onboarding column if old setup SQL created it.
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS has_completed_onboarding;
