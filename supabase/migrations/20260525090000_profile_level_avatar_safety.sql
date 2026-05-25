-- Keep profile progress and avatar URLs renderable.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;

UPDATE public.profiles
SET level = 1
WHERE level IS NULL OR level < 1;

UPDATE public.profiles
SET xp = 0
WHERE xp IS NULL OR xp < 0;

UPDATE public.profiles
SET avatar_url = NULL
WHERE avatar_url LIKE 'blob:%';

WITH repaired_progress AS (
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
)
UPDATE public.profiles profiles
SET
  level = CASE
    WHEN repaired_progress.earned_xp >= 10600 THEN 15 + FLOOR((repaired_progress.earned_xp - 10600) / 2000)::integer
    WHEN repaired_progress.earned_xp >= 8800 THEN 14
    WHEN repaired_progress.earned_xp >= 7200 THEN 13
    WHEN repaired_progress.earned_xp >= 5800 THEN 12
    WHEN repaired_progress.earned_xp >= 4600 THEN 11
    WHEN repaired_progress.earned_xp >= 3600 THEN 10
    WHEN repaired_progress.earned_xp >= 2800 THEN 9
    WHEN repaired_progress.earned_xp >= 2100 THEN 8
    WHEN repaired_progress.earned_xp >= 1500 THEN 7
    WHEN repaired_progress.earned_xp >= 1050 THEN 6
    WHEN repaired_progress.earned_xp >= 700 THEN 5
    WHEN repaired_progress.earned_xp >= 450 THEN 4
    WHEN repaired_progress.earned_xp >= 250 THEN 3
    WHEN repaired_progress.earned_xp >= 100 THEN 2
    ELSE 1
  END,
  xp = repaired_progress.earned_xp,
  updated_at = now()
FROM repaired_progress
WHERE profiles.id = repaired_progress.user_id
  AND repaired_progress.earned_xp > 0
  AND COALESCE(profiles.xp, 0) = 0
  AND COALESCE(profiles.level, 1) <= 1;

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

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_avatar_url_not_blob_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_avatar_url_not_blob_check
CHECK (avatar_url IS NULL OR avatar_url NOT LIKE 'blob:%');
