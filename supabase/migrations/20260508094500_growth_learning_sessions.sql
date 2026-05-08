-- Growth Learning Sessions: YouTube video sessions, timestamp notes, and action points.
-- Safe for existing data: adds missing columns and creates private user-owned tables.

ALTER TABLE public.growth_resources
ADD COLUMN IF NOT EXISTS video_id text,
ADD COLUMN IF NOT EXISTS watch_progress integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_watched_at timestamptz;

CREATE TABLE IF NOT EXISTS public.growth_resource_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.growth_resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp_seconds integer,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_action_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.growth_resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  converted_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_resources_video_id_idx ON public.growth_resources(video_id);
CREATE INDEX IF NOT EXISTS growth_resource_notes_resource_id_idx ON public.growth_resource_notes(resource_id);
CREATE INDEX IF NOT EXISTS growth_resource_notes_user_id_idx ON public.growth_resource_notes(user_id);
CREATE INDEX IF NOT EXISTS growth_action_points_resource_id_idx ON public.growth_action_points(resource_id);
CREATE INDEX IF NOT EXISTS growth_action_points_user_id_idx ON public.growth_action_points(user_id);

ALTER TABLE public.growth_resource_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_action_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_resource_notes_select_own ON public.growth_resource_notes;
CREATE POLICY growth_resource_notes_select_own
ON public.growth_resource_notes
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_resource_notes_insert_own ON public.growth_resource_notes;
CREATE POLICY growth_resource_notes_insert_own
ON public.growth_resource_notes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.growth_resources resource
    WHERE resource.id = resource_id
      AND resource.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS growth_resource_notes_update_own ON public.growth_resource_notes;
CREATE POLICY growth_resource_notes_update_own
ON public.growth_resource_notes
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.growth_resources resource
    WHERE resource.id = resource_id
      AND resource.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS growth_resource_notes_delete_own ON public.growth_resource_notes;
CREATE POLICY growth_resource_notes_delete_own
ON public.growth_resource_notes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_action_points_select_own ON public.growth_action_points;
CREATE POLICY growth_action_points_select_own
ON public.growth_action_points
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_action_points_insert_own ON public.growth_action_points;
CREATE POLICY growth_action_points_insert_own
ON public.growth_action_points
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.growth_resources resource
    WHERE resource.id = resource_id
      AND resource.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS growth_action_points_update_own ON public.growth_action_points;
CREATE POLICY growth_action_points_update_own
ON public.growth_action_points
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.growth_resources resource
    WHERE resource.id = resource_id
      AND resource.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS growth_action_points_delete_own ON public.growth_action_points;
CREATE POLICY growth_action_points_delete_own
ON public.growth_action_points
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_resource_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_action_points TO authenticated;
