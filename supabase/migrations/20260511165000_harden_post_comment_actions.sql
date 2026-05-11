ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created
ON public.comments(post_id, parent_comment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_comments_user_deleted
ON public.comments(user_id, deleted_at);

CREATE OR REPLACE FUNCTION public.visnova_archive_post(target_post_id uuid)
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

  UPDATE public.posts
  SET archived = true,
      archived_at = now(),
      updated_at = now()
  WHERE id = target_post_id
    AND user_id = actor_id
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
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  END IF;

  UPDATE public.posts
  SET archived = false,
      archived_at = null,
      updated_at = now()
  WHERE id = target_post_id
    AND user_id = actor_id
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
DECLARE
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  END IF;

  UPDATE public.posts
  SET archived = true,
      archived_at = coalesce(archived_at, now()),
      deleted_at = coalesce(deleted_at, now()),
      updated_at = now()
  WHERE id = target_post_id
    AND user_id = actor_id
    AND deleted_at IS NULL;

  RETURN found;
END;
$$;

CREATE OR REPLACE FUNCTION public.visnova_soft_delete_comment(target_comment_id uuid)
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

  UPDATE public.comments
  SET deleted_at = coalesce(deleted_at, now()),
      content = '',
      updated_at = now()
  WHERE id = target_comment_id
    AND user_id = actor_id
    AND deleted_at IS NULL;

  RETURN found;
END;
$$;

REVOKE ALL ON FUNCTION public.visnova_archive_post(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.visnova_restore_post(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.visnova_soft_delete_post(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.visnova_soft_delete_comment(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.visnova_archive_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visnova_restore_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visnova_soft_delete_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visnova_soft_delete_comment(uuid) TO authenticated;
