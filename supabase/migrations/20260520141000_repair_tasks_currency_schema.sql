-- Repair live beta schema for Task Board and Wallet currency preferences.
-- Safe to run more than once. It does not wipe or rewrite existing user data.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'INR';

UPDATE public.profiles
SET default_currency = 'INR'
WHERE default_currency IS NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_default_currency_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_currency_check
  CHECK (default_currency IN ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED'));

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

UPDATE public.tasks
SET priority = COALESCE(priority, 'medium'),
    visibility = COALESCE(visibility, 'private'),
    progress_percent = CASE WHEN completed IS TRUE THEN 100 ELSE COALESCE(progress_percent, 0) END,
    checklist = COALESCE(checklist, sub_tasks, '[]'::jsonb),
    sub_tasks = COALESCE(sub_tasks, checklist, '[]'::jsonb),
    metadata = COALESCE(metadata, '{}'::jsonb);

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

ALTER TABLE public.finance_goals
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

ALTER TABLE public.finance_budgets
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

ALTER TABLE public.finance_subscriptions
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

UPDATE public.finance_goals SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.finance_transactions SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.finance_budgets SET currency = 'INR' WHERE currency IS NULL;
UPDATE public.finance_subscriptions SET currency = 'INR' WHERE currency IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
