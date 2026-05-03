-- Library audio notes, profile photo storage, and built-in VisNova community.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'::JSONB;

ALTER TABLE public.communities
  ALTER COLUMN owner_id DROP NOT NULL;

INSERT INTO public.communities (
  id,
  owner_id,
  name,
  slug,
  description,
  category,
  icon,
  color
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  NULL,
  'VisNova',
  'visnova',
  'The official VisNova community for product updates, help, progress threads, and shared wins.',
  'official',
  'spark',
  '#7c3aed'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('note-audio', 'note-audio', true, 26214400, ARRAY[
    'audio/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/ogg',
    'application/ogg'
  ])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY "Users upload own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public read note audio" ON storage.objects;
CREATE POLICY "Public read note audio"
ON storage.objects
FOR SELECT
USING (bucket_id = 'note-audio');

DROP POLICY IF EXISTS "Users upload own note audio" ON storage.objects;
CREATE POLICY "Users upload own note audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own note audio" ON storage.objects;
CREATE POLICY "Users update own note audio"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own note audio" ON storage.objects;
CREATE POLICY "Users delete own note audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
