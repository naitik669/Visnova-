-- Prepare audio notes for future transcription without generating fake transcripts.

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS transcript_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS transcribed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notes_transcript_status_check'
  ) THEN
    ALTER TABLE public.notes
    ADD CONSTRAINT notes_transcript_status_check
    CHECK (transcript_status IN ('none', 'pending', 'completed', 'failed'));
  END IF;
END $$;
