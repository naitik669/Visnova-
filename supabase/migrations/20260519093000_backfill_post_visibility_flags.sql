-- Keep legacy posts visible in feed/profile queries.
-- Older rows may have NULL archive/visibility flags, while the app filters active public posts.

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';

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
