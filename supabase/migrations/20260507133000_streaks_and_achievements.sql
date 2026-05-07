-- Streaks and achievement foundations for closed beta.

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  streak_start_date date,
  activity_dates date[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_streaks_last_active_date_idx
ON public.user_streaks(last_active_date);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx
ON public.user_achievements(user_id);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS achievements_select_authenticated ON public.achievements;
CREATE POLICY achievements_select_authenticated
ON public.achievements
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS user_achievements_select_own ON public.user_achievements;
CREATE POLICY user_achievements_select_own
ON public.user_achievements
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_achievements_insert_own ON public.user_achievements;
CREATE POLICY user_achievements_insert_own
ON public.user_achievements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;

INSERT INTO public.achievements (id, title, description, icon)
VALUES
  ('first_post', 'First Post', 'Shared your first progress post.', 'message-square'),
  ('first_vision', 'First Vision', 'Created your first vision.', 'target'),
  ('week_streak', 'Week Streak', 'Stayed active for 7 days.', 'flame'),
  ('month_streak', 'Month Streak', 'Stayed active for 30 days.', 'flame'),
  ('centurion', 'Centurion', 'Stayed active for 100 days.', 'flame'),
  ('vision_complete', 'Vision Complete', 'Completed a vision.', 'check-circle'),
  ('ten_followers', 'Ten Followers', 'Reached 10 followers.', 'users')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;
