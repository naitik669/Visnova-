-- Urgent live Supabase repair for VisNova storage buckets.
--
-- Run this in the Supabase SQL editor for the VisNova project.
--
-- This is a focused copy of the storage setup from the latest migrations.
-- It fixes:
-- - Avatar upload: missing `avatars` bucket
-- - Post image upload: missing `post-images` bucket
-- - Audio notes: missing/private `note-audio` bucket
-- - NovaCapsule images: missing/private `nova-capsules` bucket

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('post-images', 'post-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('note-audio', 'note-audio', false, 26214400, ARRAY[
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
  ]),
  ('nova-capsules', 'nova-capsules', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY avatars_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatars" ON storage.objects;
CREATE POLICY avatars_insert_own_folder
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS avatars_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY avatars_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS avatars_delete_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY avatars_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS post_images_public_read ON storage.objects;
DROP POLICY IF EXISTS "Public read post images" ON storage.objects;
CREATE POLICY post_images_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS post_images_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users upload own post images" ON storage.objects;
CREATE POLICY post_images_insert_own_folder
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS post_images_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users update own post images" ON storage.objects;
CREATE POLICY post_images_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS post_images_delete_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users delete own post images" ON storage.objects;
CREATE POLICY post_images_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS note_audio_select_own_folder ON storage.objects;
DROP POLICY IF EXISTS note_audio_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS note_audio_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS note_audio_delete_own_folder ON storage.objects;

CREATE POLICY note_audio_select_own_folder
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY note_audio_insert_own_folder
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY note_audio_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY note_audio_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS nova_capsules_select_own_folder ON storage.objects;
DROP POLICY IF EXISTS nova_capsules_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS nova_capsules_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS nova_capsules_delete_own_folder ON storage.objects;

CREATE POLICY nova_capsules_select_own_folder
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY nova_capsules_insert_own_folder
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY nova_capsules_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY nova_capsules_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);
