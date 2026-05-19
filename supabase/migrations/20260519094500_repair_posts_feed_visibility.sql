-- Normalize post visibility/archive fields and ensure feed/profile reads work.
-- This is intentionally idempotent and preserves existing user content.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.posts
SET archived = false
WHERE archived IS NULL;

UPDATE public.posts
SET visibility = 'public'
WHERE visibility IS NULL OR visibility = '';

CREATE INDEX IF NOT EXISTS posts_public_active_idx
ON public.posts (created_at DESC)
WHERE visibility = 'public'
  AND deleted_at IS NULL
  AND COALESCE(archived, false) = false;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS posts_select_public_active ON public.posts;
CREATE POLICY posts_select_public_active
ON public.posts
FOR SELECT
TO anon, authenticated
USING (
  visibility = 'public'
  AND COALESCE(archived, false) = false
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS posts_select_own_all ON public.posts;
CREATE POLICY posts_select_own_all
ON public.posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_insert_own_safe ON public.posts;
CREATE POLICY posts_insert_own_safe
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_update_own_safe ON public.posts;
CREATE POLICY posts_update_own_safe
ON public.posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_delete_own_safe ON public.posts;
CREATE POLICY posts_delete_own_safe
ON public.posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_select_public_read ON public.profiles;
CREATE POLICY profiles_select_public_read
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);
