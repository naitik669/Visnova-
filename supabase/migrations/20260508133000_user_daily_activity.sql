-- Real per-day activity counts for the dashboard weekly activity graph.

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  streak_start_date date,
  activity_dates date[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_streaks_last_active_date_idx
ON public.user_streaks(last_active_date);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_streaks_select_own ON public.user_streaks;
CREATE POLICY user_streaks_select_own
ON public.user_streaks
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_streaks_insert_own ON public.user_streaks;
CREATE POLICY user_streaks_insert_own
ON public.user_streaks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_streaks_update_own ON public.user_streaks;
CREATE POLICY user_streaks_update_own
ON public.user_streaks
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  task_count integer NOT NULL DEFAULT 0,
  todo_count integer NOT NULL DEFAULT 0,
  post_count integer NOT NULL DEFAULT 0,
  note_count integer NOT NULL DEFAULT 0,
  journal_count integer NOT NULL DEFAULT 0,
  vision_count integer NOT NULL DEFAULT 0,
  focus_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS user_daily_activity_user_date_idx
ON public.user_daily_activity(user_id, activity_date DESC);

ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_daily_activity_select_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_select_own
ON public.user_daily_activity
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_daily_activity_insert_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_insert_own
ON public.user_daily_activity
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_daily_activity_update_own ON public.user_daily_activity;
CREATE POLICY user_daily_activity_update_own
ON public.user_daily_activity
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_daily_activity TO authenticated;

INSERT INTO public.user_daily_activity (user_id, activity_date, total_count, updated_at)
SELECT streaks.user_id, activity_date, 1, now()
FROM public.user_streaks streaks
CROSS JOIN LATERAL unnest(streaks.activity_dates) AS activity_date
ON CONFLICT (user_id, activity_date) DO NOTHING;
