-- Recovery migration for private user media buckets used by Notes and Nova Clock.
-- Safe to run repeatedly on projects that already have these buckets.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
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
  ),
  (
    'nova-capsules',
    'nova-capsules',
    false,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS note_audio_read_own_folder ON storage.objects;
CREATE POLICY note_audio_read_own_folder
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS note_audio_insert_own_folder ON storage.objects;
CREATE POLICY note_audio_insert_own_folder
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS note_audio_update_own_folder ON storage.objects;
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
CREATE POLICY note_audio_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'note-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_select_own ON storage.objects;
CREATE POLICY nova_capsules_storage_select_own
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_insert_own ON storage.objects;
CREATE POLICY nova_capsules_storage_insert_own
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_update_own ON storage.objects;
CREATE POLICY nova_capsules_storage_update_own
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_delete_own ON storage.objects;
CREATE POLICY nova_capsules_storage_delete_own
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
