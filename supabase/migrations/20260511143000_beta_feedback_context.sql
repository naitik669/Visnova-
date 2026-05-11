ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_severity_check;
ALTER TABLE public.feedback_reports
  ADD CONSTRAINT feedback_reports_severity_check
  CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT VALID;

ALTER TABLE public.feedback_reports DROP CONSTRAINT IF EXISTS feedback_reports_title_length_check;
ALTER TABLE public.feedback_reports
  ADD CONSTRAINT feedback_reports_title_length_check
  CHECK (title IS NULL OR char_length(title) <= 120) NOT VALID;

CREATE INDEX IF NOT EXISTS feedback_reports_category_severity_created_idx
ON public.feedback_reports(category, severity, created_at DESC);
