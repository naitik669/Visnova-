-- Closed-beta security hardening for VisNova.
-- Safe to rerun: preserves user data and only tightens contracts/policies.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_identifier_action_idx
ON public.rate_limits (identifier, action);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rate_limits_select_own ON public.rate_limits;
CREATE POLICY rate_limits_select_own
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS rate_limits_insert_scoped ON public.rate_limits;
CREATE POLICY rate_limits_insert_scoped
ON public.rate_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS rate_limits_update_scoped ON public.rate_limits;
CREATE POLICY rate_limits_update_scoped
ON public.rate_limits
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer,
  p_window_minutes integer
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
AS $$
DECLARE
  existing public.rate_limits%ROWTYPE;
  now_ts timestamptz := now();
  window_interval interval := make_interval(mins => p_window_minutes);
BEGIN
  IF p_identifier IS NULL OR length(trim(p_identifier)) = 0 THEN
    p_identifier := COALESCE(auth.uid()::text, 'anonymous');
  END IF;
  p_identifier := encode(digest(lower(trim(p_identifier)), 'sha256'), 'hex');

  SELECT *
  INTO existing
  FROM public.rate_limits rl
  WHERE rl.identifier = p_identifier
    AND rl.action = p_action
  FOR UPDATE;

  IF NOT FOUND OR existing.window_start + window_interval <= now_ts THEN
    INSERT INTO public.rate_limits(user_id, identifier, action, attempts, window_start, updated_at)
    VALUES (auth.uid(), p_identifier, p_action, 1, now_ts, now_ts)
    ON CONFLICT (identifier, action)
    DO UPDATE SET attempts = 1, window_start = excluded.window_start, updated_at = excluded.updated_at;

    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  UPDATE public.rate_limits
  SET attempts = attempts + 1,
      updated_at = now_ts
  WHERE id = existing.id
  RETURNING * INTO existing;

  IF existing.attempts > p_max_attempts THEN
    RETURN QUERY SELECT false, GREATEST(1, EXTRACT(EPOCH FROM (existing.window_start + window_interval - now_ts))::integer);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO anon, authenticated;

-- Payload constraints. These reject obviously oversized/malformed writes even if frontend validation is bypassed.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_length_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_length_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (username IS NULL OR username = '' OR username ~ '^[a-z0-9_]{3,24}$') NOT VALID,
  ADD CONSTRAINT profiles_display_name_length_check
  CHECK (display_name IS NULL OR char_length(display_name) <= 60) NOT VALID,
  ADD CONSTRAINT profiles_bio_length_check
  CHECK (bio IS NULL OR char_length(bio) <= 300) NOT VALID;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_content_length_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_content_length_check
  CHECK (
    char_length(COALESCE(content, '')) <= 2000
    AND char_length(COALESCE(caption, '')) <= CASE WHEN type = 'status' THEN 160 ELSE 2000 END
  ) NOT VALID;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_content_length_check;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_content_length_check
  CHECK (char_length(COALESCE(content, '')) BETWEEN 1 AND 1000) NOT VALID;

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_title_length_check;
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_content_length_check;
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_transcript_status_check;
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS transcript text,
  ADD COLUMN IF NOT EXISTS transcript_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS transcribed_at timestamptz,
  ADD CONSTRAINT notes_title_length_check
  CHECK (char_length(COALESCE(title, '')) <= 120) NOT VALID,
  ADD CONSTRAINT notes_content_length_check
  CHECK (
    char_length(COALESCE(content, '')) <= CASE WHEN note_type = 'journal' THEN 20000 ELSE 50000 END
  ) NOT VALID,
  ADD CONSTRAINT notes_transcript_status_check
  CHECK (transcript_status IN ('none', 'pending', 'completed', 'failed')) NOT VALID;

ALTER TABLE public.visions DROP CONSTRAINT IF EXISTS visions_title_length_check;
ALTER TABLE public.visions DROP CONSTRAINT IF EXISTS visions_description_length_check;
ALTER TABLE public.visions DROP CONSTRAINT IF EXISTS visions_elements_size_check;
ALTER TABLE public.visions
  ADD CONSTRAINT visions_title_length_check
  CHECK (title IS NULL OR char_length(title) <= 120) NOT VALID,
  ADD CONSTRAINT visions_description_length_check
  CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID,
  ADD CONSTRAINT visions_elements_size_check
  CHECK (jsonb_typeof(COALESCE(elements, '[]'::jsonb)) = 'array' AND jsonb_array_length(COALESCE(elements, '[]'::jsonb)) <= 500) NOT VALID;

ALTER TABLE public.growth_resources DROP CONSTRAINT IF EXISTS growth_resources_title_length_check;
ALTER TABLE public.growth_resources DROP CONSTRAINT IF EXISTS growth_resources_notes_length_check;
ALTER TABLE public.growth_resources DROP CONSTRAINT IF EXISTS growth_resources_source_type_check;
ALTER TABLE public.growth_resources DROP CONSTRAINT IF EXISTS growth_resources_status_check;
ALTER TABLE public.growth_resources
  ADD COLUMN IF NOT EXISTS video_id text,
  ADD COLUMN IF NOT EXISTS watch_progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_watched_at timestamptz,
  ADD CONSTRAINT growth_resources_title_length_check
  CHECK (char_length(COALESCE(title, '')) BETWEEN 1 AND 160) NOT VALID,
  ADD CONSTRAINT growth_resources_notes_length_check
  CHECK (char_length(COALESCE(notes, '')) <= 20000) NOT VALID,
  ADD CONSTRAINT growth_resources_source_type_check
  CHECK (source_type IN ('youtube', 'article', 'course', 'book', 'podcast', 'pdf', 'website', 'other')) NOT VALID,
  ADD CONSTRAINT growth_resources_status_check
  CHECK (status IN ('saved', 'learning', 'completed', 'applied', 'archived')) NOT VALID;

ALTER TABLE public.growth_resource_notes DROP CONSTRAINT IF EXISTS growth_resource_notes_content_length_check;
ALTER TABLE public.growth_resource_notes
  ADD CONSTRAINT growth_resource_notes_content_length_check
  CHECK (char_length(COALESCE(content, '')) BETWEEN 1 AND 1000) NOT VALID;

ALTER TABLE public.growth_action_points DROP CONSTRAINT IF EXISTS growth_action_points_text_length_check;
ALTER TABLE public.growth_action_points
  ADD CONSTRAINT growth_action_points_text_length_check
  CHECK (char_length(COALESCE(text, '')) BETWEEN 1 AND 500) NOT VALID;

ALTER TABLE public.nova_capsules DROP CONSTRAINT IF EXISTS nova_capsules_title_length_check;
ALTER TABLE public.nova_capsules DROP CONSTRAINT IF EXISTS nova_capsules_message_length_check;
ALTER TABLE public.nova_capsules
  ADD CONSTRAINT nova_capsules_title_length_check
  CHECK (char_length(COALESCE(title, '')) BETWEEN 1 AND 120) NOT VALID,
  ADD CONSTRAINT nova_capsules_message_length_check
  CHECK (char_length(COALESCE(message, '')) <= 10000) NOT VALID;

ALTER TABLE public.community_threads DROP CONSTRAINT IF EXISTS community_threads_title_length_check;
ALTER TABLE public.community_threads
  ADD CONSTRAINT community_threads_title_length_check
  CHECK (char_length(COALESCE(title, '')) BETWEEN 1 AND 160) NOT VALID;

ALTER TABLE public.community_thread_messages DROP CONSTRAINT IF EXISTS community_thread_messages_content_length_check;
ALTER TABLE public.community_thread_messages
  ADD CONSTRAINT community_thread_messages_content_length_check
  CHECK (char_length(COALESCE(content, '')) BETWEEN 1 AND 2000) NOT VALID;

-- Storage contracts: buckets enforce size/MIME, policies enforce user-scoped paths.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png','image/jpeg','image/webp']),
  ('post-images', 'post-images', true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('note-audio', 'note-audio', false, 26214400, ARRAY['audio/webm','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/wave','audio/ogg','application/ogg']),
  ('nova-capsules', 'nova-capsules', false, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('vision-board-images', 'vision-board-images', true, 10485760, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS storage_insert_own_path ON storage.objects;
CREATE POLICY storage_insert_own_path
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'post-images', 'note-audio', 'nova-capsules', 'vision-board-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS storage_update_own_path ON storage.objects;
CREATE POLICY storage_update_own_path
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('avatars', 'post-images', 'note-audio', 'nova-capsules', 'vision-board-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id IN ('avatars', 'post-images', 'note-audio', 'nova-capsules', 'vision-board-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS storage_delete_own_path ON storage.objects;
CREATE POLICY storage_delete_own_path
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('avatars', 'post-images', 'note-audio', 'nova-capsules', 'vision-board-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS storage_public_media_read ON storage.objects;
CREATE POLICY storage_public_media_read
ON storage.objects
FOR SELECT
USING (bucket_id IN ('avatars', 'post-images', 'vision-board-images'));

DROP POLICY IF EXISTS storage_private_media_read_own ON storage.objects;
CREATE POLICY storage_private_media_read_own
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN ('note-audio', 'nova-capsules')
  AND auth.uid()::text = (storage.foldername(name))[1]
);
