-- Privacy lock for closed beta.
-- Keeps existing data, normalizes legacy visibility values, and makes private the
-- database default for sensitive user-created objects.

-- ---------------------------------------------------------------------------
-- 1. User privacy preference columns. Frontend can adopt these progressively;
-- local settings remain the immediate UI fallback.
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS default_visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS progress_log_default_visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS message_permissions text DEFAULT 'circle',
  ADD COLUMN IF NOT EXISTS mention_permissions text DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS personalized_recommendations boolean DEFAULT false;

UPDATE public.profiles
SET
  default_visibility = COALESCE(NULLIF(default_visibility, ''), 'private'),
  progress_log_default_visibility = COALESCE(NULLIF(progress_log_default_visibility, ''), 'private'),
  profile_visibility = COALESCE(NULLIF(profile_visibility, ''), 'public'),
  message_permissions = COALESCE(NULLIF(message_permissions, ''), 'circle'),
  mention_permissions = COALESCE(NULLIF(mention_permissions, ''), 'everyone'),
  personalized_recommendations = COALESCE(personalized_recommendations, false);

-- ---------------------------------------------------------------------------
-- 2. Normalize visibility on sensitive content. Unknown/null -> private.
-- Legacy friends/connections/followers -> circle.
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.visions ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.todos ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.notes ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.posts ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.progress_logs ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.growth_timeline_events ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.ai_insights ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.finance_goals ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.finance_transactions ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.nova_capsules ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';
ALTER TABLE IF EXISTS public.vision_resources ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

CREATE OR REPLACE FUNCTION public.normalize_visnova_visibility(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input = 'public' THEN 'public'
    WHEN input IN ('circle', 'connections', 'friends', 'followers') THEN 'circle'
    ELSE 'private'
  END
$$;

UPDATE public.visions SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.tasks SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.todos SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.notes SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.posts SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.progress_logs SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.growth_timeline_events SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.ai_insights SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.finance_goals SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.finance_transactions SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.nova_capsules SET visibility = public.normalize_visnova_visibility(visibility);
UPDATE public.vision_resources SET visibility = public.normalize_visnova_visibility(visibility);

-- ---------------------------------------------------------------------------
-- 3. Private progress logs lock.
-- Circle logs are intentionally owner-only until dedicated Circle ACL is proven.
-- Public logs remain public; private/circle logs are owner-only.
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.progress_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS progress_logs_select_ecosystem ON public.progress_logs;
DROP POLICY IF EXISTS progress_logs_select_owner_public ON public.progress_logs;
CREATE POLICY progress_logs_select_owner_public
ON public.progress_logs
FOR SELECT
USING (
  auth.uid() = user_id
  OR visibility = 'public'
);

DROP POLICY IF EXISTS progress_logs_insert_own ON public.progress_logs;
CREATE POLICY progress_logs_insert_own
ON public.progress_logs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.normalize_visnova_visibility(visibility) IN ('private', 'circle', 'public')
  AND (
    vision_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.visions
      WHERE visions.id = progress_logs.vision_id
        AND visions.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS progress_logs_update_own ON public.progress_logs;
CREATE POLICY progress_logs_update_own
ON public.progress_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS progress_logs_delete_own ON public.progress_logs;
CREATE POLICY progress_logs_delete_own
ON public.progress_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Timeline and AI insight rows mirror the same privacy posture.
ALTER TABLE IF EXISTS public.growth_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_timeline_select_ecosystem ON public.growth_timeline_events;
DROP POLICY IF EXISTS growth_timeline_select_owner_public ON public.growth_timeline_events;
CREATE POLICY growth_timeline_select_owner_public
ON public.growth_timeline_events
FOR SELECT
USING (auth.uid() = user_id OR visibility = 'public');

DROP POLICY IF EXISTS ai_insights_select_ecosystem ON public.ai_insights;
DROP POLICY IF EXISTS ai_insights_select_own ON public.ai_insights;
CREATE POLICY ai_insights_select_own
ON public.ai_insights
FOR SELECT
USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Storage privacy. Remove legacy public-read policies from private buckets.
-- Public avatars/post-images stay public. Vision board images remain compatible
-- with the current public URL implementation and should move to signed URLs in
-- the next storage pass.
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
SET public = false
WHERE id IN ('note-audio', 'journal-images', 'nova-capsules');

DROP POLICY IF EXISTS "Public read note audio" ON storage.objects;
DROP POLICY IF EXISTS note_audio_public_read ON storage.objects;
DROP POLICY IF EXISTS note_audio_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS nova_capsules_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS "NovaCapsules are public" ON storage.objects;
DROP POLICY IF EXISTS "Journal images are public" ON storage.objects;

DROP POLICY IF EXISTS note_audio_storage_select_own ON storage.objects;
CREATE POLICY note_audio_storage_select_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS journal_images_select_own ON storage.objects;
CREATE POLICY journal_images_select_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'journal-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS nova_capsules_storage_select_own ON storage.objects;
CREATE POLICY nova_capsules_storage_select_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- 5. Basic owner RLS for resource/money privacy where these tables exist.
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.finance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vision_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_goals_select_own ON public.finance_goals;
CREATE POLICY finance_goals_select_own ON public.finance_goals
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_transactions_select_own ON public.finance_transactions;
CREATE POLICY finance_transactions_select_own ON public.finance_transactions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vision_resources_select_own ON public.vision_resources;
CREATE POLICY vision_resources_select_own ON public.vision_resources
FOR SELECT USING (auth.uid() = user_id);
