-- Make post archive a private visibility state, separate from delete.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.posts
SET archived = true,
    archived_at = COALESCE(archived_at, updated_at, now()),
    visibility = 'public'
WHERE visibility = 'archived';

ALTER TABLE public.posts ALTER COLUMN archived SET DEFAULT false;

CREATE INDEX IF NOT EXISTS posts_archived_user_idx
ON public.posts(user_id, archived, created_at DESC);

CREATE INDEX IF NOT EXISTS posts_feed_visibility_idx
ON public.posts(visibility, archived, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_select_public ON public.posts;
DROP POLICY IF EXISTS posts_select_public_unarchived ON public.posts;
CREATE POLICY posts_select_public_unarchived
ON public.posts
FOR SELECT
USING (
  visibility = 'public'
  AND archived = false
  AND deleted_at IS NULL
);

DROP POLICY IF EXISTS posts_select_own ON public.posts;
CREATE POLICY posts_select_own
ON public.posts
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_update_own ON public.posts;
CREATE POLICY posts_update_own
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_delete_own ON public.posts;
CREATE POLICY posts_delete_own
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);
