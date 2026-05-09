CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'feedback',
  message text NOT NULL,
  contact_email text,
  page_url text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'feedback',
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS page_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_category_check;
ALTER TABLE public.feedback_reports
  ADD CONSTRAINT feedback_reports_category_check
  CHECK (category IN ('bug', 'content', 'account', 'feedback')) NOT VALID;

ALTER TABLE public.feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_status_check;
ALTER TABLE public.feedback_reports
  ADD CONSTRAINT feedback_reports_status_check
  CHECK (status IN ('new', 'reviewing', 'resolved', 'closed')) NOT VALID;

ALTER TABLE public.feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_message_length_check;
ALTER TABLE public.feedback_reports
  ADD CONSTRAINT feedback_reports_message_length_check
  CHECK (char_length(COALESCE(message, '')) BETWEEN 1 AND 3000) NOT VALID;

CREATE INDEX IF NOT EXISTS feedback_reports_user_created_idx
ON public.feedback_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_reports_status_created_idx
ON public.feedback_reports(status, created_at DESC);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_reports_insert_anyone ON public.feedback_reports;
CREATE POLICY feedback_reports_insert_anyone
ON public.feedback_reports
FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS feedback_reports_select_own ON public.feedback_reports;
CREATE POLICY feedback_reports_select_own
ON public.feedback_reports
FOR SELECT
USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.feedback_reports TO anon, authenticated;
