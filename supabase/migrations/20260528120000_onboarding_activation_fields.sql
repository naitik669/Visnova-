-- Adds optional activation-onboarding profile fields.
-- Existing onboarding remains keyed by profiles.onboarded for compatibility.

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS user_type text,
  ADD COLUMN IF NOT EXISTS selected_theme text DEFAULT 'lavender',
  ADD COLUMN IF NOT EXISTS first_vision_id uuid,
  ADD COLUMN IF NOT EXISTS first_task_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

UPDATE public.profiles
SET selected_theme = COALESCE(NULLIF(selected_theme, ''), 'lavender')
WHERE selected_theme IS NULL OR selected_theme = '';
