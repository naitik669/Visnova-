-- Notes/audio note contract and Vision Board image uploads.
-- Safe to rerun and preserves existing note data.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS audio_duration integer,
  ADD COLUMN IF NOT EXISTS audio_mime_type text;

ALTER TABLE public.notes ALTER COLUMN note_type SET DEFAULT 'normal';

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_note_type_check;

UPDATE public.notes
SET note_type = 'normal'
WHERE note_type IN ('library', 'vault');

ALTER TABLE public.notes
  ADD CONSTRAINT notes_note_type_check CHECK (note_type IN ('normal', 'audio', 'journal'));

CREATE INDEX IF NOT EXISTS idx_notes_user_type_updated_at
ON public.notes(user_id, note_type, updated_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vision-board-images',
  'vision-board-images',
  true,
  10485760,
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS vision_board_images_public_read ON storage.objects;
CREATE POLICY vision_board_images_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'vision-board-images');

DROP POLICY IF EXISTS vision_board_images_insert_own ON storage.objects;
CREATE POLICY vision_board_images_insert_own
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vision-board-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS vision_board_images_update_own ON storage.objects;
CREATE POLICY vision_board_images_update_own
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'vision-board-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'vision-board-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS vision_board_images_delete_own ON storage.objects;
CREATE POLICY vision_board_images_delete_own
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'vision-board-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
