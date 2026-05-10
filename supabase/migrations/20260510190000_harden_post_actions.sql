ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS edited_at timestamptz,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.posts
SET archived = false
WHERE archived IS NULL;

UPDATE public.posts
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_visibility_feed
ON public.posts(visibility, archived, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_owner_archive
ON public.posts(user_id, archived, deleted_at, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (
    target_type IN ('post', 'comment', 'message', 'user', 'community', 'thread')
  ),
  target_id uuid NOT NULL,
  target_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'dismissed', 'action_taken')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(reporter_id, target_type, target_id)
);

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS target_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS details text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE public.reports
ADD CONSTRAINT reports_target_type_check
CHECK (target_type IN ('post', 'comment', 'message', 'user', 'community', 'thread'));

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports
ADD CONSTRAINT reports_status_check
CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken'));

CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_target_unique
ON public.reports(reporter_id, target_type, target_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS reports_insert_authenticated ON public.reports;
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own
ON public.reports
FOR SELECT
USING (auth.uid() = reporter_id);

CREATE OR REPLACE FUNCTION public.visnova_archive_post(target_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET archived = true,
      archived_at = now(),
      updated_at = now()
  WHERE id = target_post_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;

  RETURN found;
END;
$$;

CREATE OR REPLACE FUNCTION public.visnova_restore_post(target_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET archived = false,
      archived_at = null,
      updated_at = now()
  WHERE id = target_post_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;

  RETURN found;
END;
$$;

CREATE OR REPLACE FUNCTION public.visnova_soft_delete_post(target_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET deleted_at = coalesce(deleted_at, now()),
      updated_at = now()
  WHERE id = target_post_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;

  RETURN found;
END;
$$;

REVOKE ALL ON FUNCTION public.visnova_archive_post(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.visnova_restore_post(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.visnova_soft_delete_post(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.visnova_archive_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visnova_restore_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visnova_soft_delete_post(uuid) TO authenticated;
