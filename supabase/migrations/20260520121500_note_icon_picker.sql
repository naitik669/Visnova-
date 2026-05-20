-- Add optional user-selected icons for Library notes.
-- Nullable keeps existing notes untouched and safe.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS note_icon text;

