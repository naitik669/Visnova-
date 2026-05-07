-- Ensure avatar and post image storage buckets exist in live Supabase.
-- This is intentionally idempotent so older projects can recover from skipped storage setup.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('post-images', 'post-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
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
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS avatars_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY avatars_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS avatars_delete_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY avatars_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

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
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS post_images_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users update own post images" ON storage.objects;
CREATE POLICY post_images_update_own_folder
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS post_images_delete_own_folder ON storage.objects;
DROP POLICY IF EXISTS "Users delete own post images" ON storage.objects;
CREATE POLICY post_images_delete_own_folder
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
