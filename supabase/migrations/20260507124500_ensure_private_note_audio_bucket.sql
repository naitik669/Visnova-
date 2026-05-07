-- Ensure audio notes have a real private storage bucket in live Supabase.
-- The previous blocker migration made note-audio private only if it already existed.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'note-audio',
  'note-audio',
  false,
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
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS audio_path text;

DROP POLICY IF EXISTS note_audio_public_read ON storage.objects;
DROP POLICY IF EXISTS "note_audio_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public read note audio" ON storage.objects;

DROP POLICY IF EXISTS note_audio_read_own_folder ON storage.objects;
CREATE POLICY note_audio_read_own_folder
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS note_audio_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users upload own note audio" ON storage.objects;
CREATE POLICY note_audio_insert_own_folder
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS note_audio_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users update own note audio" ON storage.objects;
CREATE POLICY note_audio_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS note_audio_delete_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users delete own note audio" ON storage.objects;
CREATE POLICY note_audio_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
