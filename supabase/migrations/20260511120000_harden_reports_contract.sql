ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_target_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('user', 'post', 'message', 'comment'));

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reason_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_check
  CHECK (reason IN (
    'spam',
    'harassment',
    'hate',
    'sexual_content',
    'violence',
    'self_harm',
    'scam',
    'impersonation',
    'privacy',
    'illegal_content',
    'other',
    'User Reported'
  ));

UPDATE public.reports
SET reason = 'other'
WHERE reason = 'User Reported';

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reason_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_check
  CHECK (reason IN (
    'spam',
    'harassment',
    'hate',
    'sexual_content',
    'violence',
    'self_harm',
    'scam',
    'impersonation',
    'privacy',
    'illegal_content',
    'other'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_target_unique_idx
  ON public.reports(reporter_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS reports_target_owner_status_idx
  ON public.reports(target_owner_id, status, created_at DESC);

GRANT SELECT, INSERT ON public.reports TO authenticated;
