-- Repair profile XP/level from real activity sources so dashboards do not show stale 0 XP.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;

WITH xp_event_totals AS (
  SELECT
    user_id,
    COALESCE(SUM(xp_amount), 0)::integer AS earned_xp
  FROM public.xp_events
  GROUP BY user_id
),
completed_task_totals AS (
  SELECT
    user_id,
    (COUNT(*) * 25)::integer AS earned_xp
  FROM public.tasks
  WHERE completed = true
    AND deleted_at IS NULL
  GROUP BY user_id
),
completed_todo_totals AS (
  SELECT
    user_id,
    (COUNT(*) * 25)::integer AS earned_xp
  FROM public.todos
  WHERE completed = true
    AND deleted_at IS NULL
  GROUP BY user_id
),
proof_log_totals AS (
  SELECT
    user_id,
    (COUNT(*) * 50)::integer AS earned_xp
  FROM public.progress_logs
  GROUP BY user_id
),
daily_activity_totals AS (
  SELECT
    user_id,
    (
      COALESCE(SUM(task_count), 0) * 15
      + COALESCE(SUM(todo_count), 0) * 20
      + COALESCE(SUM(post_count), 0) * 50
      + COALESCE(SUM(note_count), 0) * 10
      + COALESCE(SUM(journal_count), 0) * 10
      + COALESCE(SUM(vision_count), 0) * 25
      + COALESCE(SUM(focus_count), 0) * 25
    )::integer AS earned_xp
  FROM public.user_daily_activity
  GROUP BY user_id
),
earned_totals AS (
  SELECT
    profiles.id AS user_id,
    GREATEST(
      COALESCE(profiles.xp, 0),
      COALESCE(xp_event_totals.earned_xp, 0),
      COALESCE(completed_task_totals.earned_xp, 0)
        + COALESCE(completed_todo_totals.earned_xp, 0)
        + COALESCE(proof_log_totals.earned_xp, 0),
      COALESCE(daily_activity_totals.earned_xp, 0)
    )::integer AS repaired_xp
  FROM public.profiles
  LEFT JOIN xp_event_totals ON xp_event_totals.user_id = profiles.id
  LEFT JOIN completed_task_totals ON completed_task_totals.user_id = profiles.id
  LEFT JOIN completed_todo_totals ON completed_todo_totals.user_id = profiles.id
  LEFT JOIN proof_log_totals ON proof_log_totals.user_id = profiles.id
  LEFT JOIN daily_activity_totals ON daily_activity_totals.user_id = profiles.id
),
profile_repairs AS (
  SELECT
    user_id,
    repaired_xp,
    CASE
      WHEN repaired_xp >= 10600 THEN 15 + FLOOR((repaired_xp - 10600) / 2000)::integer
      WHEN repaired_xp >= 8800 THEN 14
      WHEN repaired_xp >= 7200 THEN 13
      WHEN repaired_xp >= 5800 THEN 12
      WHEN repaired_xp >= 4600 THEN 11
      WHEN repaired_xp >= 3600 THEN 10
      WHEN repaired_xp >= 2800 THEN 9
      WHEN repaired_xp >= 2100 THEN 8
      WHEN repaired_xp >= 1500 THEN 7
      WHEN repaired_xp >= 1050 THEN 6
      WHEN repaired_xp >= 700 THEN 5
      WHEN repaired_xp >= 450 THEN 4
      WHEN repaired_xp >= 250 THEN 3
      WHEN repaired_xp >= 100 THEN 2
      ELSE 1
    END AS repaired_level
  FROM earned_totals
)
UPDATE public.profiles profiles
SET
  xp = profile_repairs.repaired_xp,
  level = GREATEST(COALESCE(profiles.level, 1), profile_repairs.repaired_level),
  updated_at = now()
FROM profile_repairs
WHERE profiles.id = profile_repairs.user_id
  AND profile_repairs.repaired_xp > COALESCE(profiles.xp, 0);

ALTER TABLE public.profiles
ALTER COLUMN level SET DEFAULT 1,
ALTER COLUMN xp SET DEFAULT 0;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_level_min_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_level_min_check
CHECK (level >= 1);

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_xp_nonnegative_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_xp_nonnegative_check
CHECK (xp >= 0);
