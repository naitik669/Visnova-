-- Repair note audio storage compatibility and make blueprint task metadata durable.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'::JSONB;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-audio',
  'note-audio',
  true,
  26214400,
  ARRAY[
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
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

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
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Users update own note audio" ON storage.objects;
CREATE POLICY "Users update own note audio"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
)
WITH CHECK (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Users delete own note audio" ON storage.objects;
CREATE POLICY "Users delete own note audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'note-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
