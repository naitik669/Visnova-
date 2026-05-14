-- Restore access to legacy Vision Boards created before the user_id ownership contract.
-- Safe to rerun: no user data is dropped.

ALTER TABLE public.visions
ADD COLUMN IF NOT EXISTS user_email text;

UPDATE public.visions v
SET user_id = p.id,
    updated_at = COALESCE(v.updated_at, now())
FROM public.profiles p
WHERE v.user_id IS NULL
  AND v.user_email IS NOT NULL
  AND lower(v.user_email) = lower(p.email);

UPDATE public.tasks t
SET user_id = v.user_id,
    updated_at = COALESCE(t.updated_at, now())
FROM public.visions v
WHERE t.user_id IS NULL
  AND t.vision_id = v.id
  AND v.user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visions_user_email
ON public.visions(lower(user_email));

DROP POLICY IF EXISTS visions_select ON public.visions;
CREATE POLICY visions_select
ON public.visions
FOR SELECT
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR lower(COALESCE(user_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS visions_insert_own ON public.visions;
CREATE POLICY visions_insert_own
ON public.visions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS visions_update_own ON public.visions;
CREATE POLICY visions_update_own
ON public.visions
FOR UPDATE
USING (
  auth.uid() = user_id
  OR lower(COALESCE(user_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  auth.uid() = user_id
  OR lower(COALESCE(user_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS visions_delete_own ON public.visions;
CREATE POLICY visions_delete_own
ON public.visions
FOR DELETE
USING (
  auth.uid() = user_id
  OR lower(COALESCE(user_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
CREATE POLICY tasks_select_own
ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.visions v
    WHERE v.id = tasks.vision_id
      AND (
        auth.uid() = v.user_id
        OR lower(COALESCE(v.user_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  )
);
