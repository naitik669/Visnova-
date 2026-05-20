-- Task Board support: status columns, richer cards, and safe filtering.
-- All fields are nullable/defaulted so existing Vision tasks keep working.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS progress_percent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS sub_tasks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.tasks
SET status = CASE
  WHEN completed IS TRUE THEN 'done'
  WHEN status IS NULL THEN 'planned'
  ELSE status
END;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('planned', 'today', 'in_progress', 'proof_needed', 'done'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_progress_percent_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_progress_percent_check
  CHECK (progress_percent BETWEEN 0 AND 100);

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_visibility_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_visibility_check
  CHECK (visibility IN ('private', 'circle', 'public'));

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
