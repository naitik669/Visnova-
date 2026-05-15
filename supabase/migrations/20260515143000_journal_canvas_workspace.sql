-- Visual Journal canvas support. Safe to run multiple times.

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS journal_canvas jsonb DEFAULT '[]'::jsonb;

UPDATE public.notes
SET journal_canvas = '[]'::jsonb
WHERE journal_canvas IS NULL;

CREATE INDEX IF NOT EXISTS notes_journal_canvas_gin_idx
ON public.notes USING gin (journal_canvas)
WHERE note_type = 'journal';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-images',
  'journal-images',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "Journal images are readable by owner" ON storage.objects;
CREATE POLICY "Journal images are readable by owner"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Journal images are insertable by owner" ON storage.objects;
CREATE POLICY "Journal images are insertable by owner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Journal images are updatable by owner" ON storage.objects;
CREATE POLICY "Journal images are updatable by owner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'journal-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Journal images are deletable by owner" ON storage.objects;
CREATE POLICY "Journal images are deletable by owner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
