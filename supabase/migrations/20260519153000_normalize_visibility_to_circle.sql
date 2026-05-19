-- Normalize beta visibility values to the final private/circle/public model.
-- Older builds used friends/connections for the same audience concept.

UPDATE public.posts
SET visibility = 'circle'
WHERE visibility IN ('friends', 'connections');

UPDATE public.visions
SET visibility = 'circle'
WHERE visibility IN ('friends', 'connections');

UPDATE public.notes
SET visibility = 'circle'
WHERE visibility IN ('friends', 'connections');

UPDATE public.progress_logs
SET visibility = 'circle'
WHERE visibility IN ('friends', 'connections');

UPDATE public.growth_timeline_events
SET visibility = 'circle'
WHERE visibility IN ('friends', 'connections');

UPDATE public.ai_insights
SET visibility = 'circle'
WHERE visibility IN ('friends', 'connections');

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('public', 'private', 'circle'));

ALTER TABLE public.progress_logs DROP CONSTRAINT IF EXISTS progress_logs_visibility_check;
ALTER TABLE public.progress_logs
  ADD CONSTRAINT progress_logs_visibility_check
  CHECK (visibility IN ('private', 'circle', 'public'));

ALTER TABLE public.growth_timeline_events DROP CONSTRAINT IF EXISTS growth_timeline_visibility_check;
ALTER TABLE public.growth_timeline_events
  ADD CONSTRAINT growth_timeline_visibility_check
  CHECK (visibility IN ('private', 'circle', 'public'));

ALTER TABLE public.ai_insights DROP CONSTRAINT IF EXISTS ai_insights_visibility_check;
ALTER TABLE public.ai_insights
  ADD CONSTRAINT ai_insights_visibility_check
  CHECK (visibility IN ('private', 'circle', 'public'));
