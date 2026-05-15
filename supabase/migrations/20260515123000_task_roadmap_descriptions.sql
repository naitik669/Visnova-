-- Adds editable descriptions for Vision execution roadmap steps.
-- Safe to run multiple times.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.tasks.description IS 'Optional roadmap detail/success criteria shown in the Vision execution blueprint.';
