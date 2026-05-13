-- Add beta-ready comment likes and post-owner comment pinning.
-- Safe to rerun: preserves existing comments and likes.

ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id
ON public.comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_pinned_created
ON public.comments(post_id, is_pinned DESC, pinned_at DESC, created_at);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_likes_select_visible ON public.comment_likes;
CREATE POLICY comment_likes_select_visible
ON public.comment_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.id = comment_likes.comment_id
      AND c.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND (p.visibility = 'public' OR p.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS comment_likes_insert_own ON public.comment_likes;
CREATE POLICY comment_likes_insert_own
ON public.comment_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.id = comment_likes.comment_id
      AND c.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND (p.visibility = 'public' OR p.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS comment_likes_delete_own ON public.comment_likes;
CREATE POLICY comment_likes_delete_own
ON public.comment_likes
FOR DELETE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.visnova_toggle_comment_pin(target_comment_id uuid, target_pinned boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  END IF;

  UPDATE public.comments c
  SET is_pinned = target_pinned,
      pinned_at = CASE WHEN target_pinned THEN now() ELSE null END,
      pinned_by = CASE WHEN target_pinned THEN actor_id ELSE null END,
      updated_at = now()
  FROM public.posts p
  WHERE c.id = target_comment_id
    AND c.post_id = p.id
    AND p.user_id = actor_id
    AND c.deleted_at IS NULL
    AND p.deleted_at IS NULL;

  RETURN found;
END;
$$;

REVOKE ALL ON FUNCTION public.visnova_toggle_comment_pin(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.visnova_toggle_comment_pin(uuid, boolean) TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
