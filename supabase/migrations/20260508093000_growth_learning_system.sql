-- Growth: learning-to-action system.
-- Safe for existing projects: creates missing tables, indexes, grants, and RLS policies.

CREATE TABLE IF NOT EXISTS public.growth_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('youtube', 'article', 'course', 'book', 'podcast', 'pdf', 'website', 'other')),
  source_name text,
  thumbnail_url text,
  category text,
  status text NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'learning', 'completed', 'applied', 'archived')),
  purpose text,
  linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  notes text,
  key_takeaways text[] NOT NULL DEFAULT '{}',
  action_points text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  applied_note text,
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  completed_at timestamptz,
  applied_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  level integer NOT NULL DEFAULT 1,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  progress integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_path_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.growth_resources(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_resources_user_id_idx ON public.growth_resources(user_id);
CREATE INDEX IF NOT EXISTS growth_resources_status_idx ON public.growth_resources(status);
CREATE INDEX IF NOT EXISTS growth_resources_linked_vision_id_idx ON public.growth_resources(linked_vision_id);
CREATE INDEX IF NOT EXISTS growth_resources_updated_at_idx ON public.growth_resources(updated_at DESC);
CREATE INDEX IF NOT EXISTS growth_skills_user_id_idx ON public.growth_skills(user_id);
CREATE INDEX IF NOT EXISTS learning_paths_user_id_idx ON public.learning_paths(user_id);
CREATE INDEX IF NOT EXISTS learning_path_items_path_id_idx ON public.learning_path_items(path_id);
CREATE INDEX IF NOT EXISTS learning_path_items_user_id_idx ON public.learning_path_items(user_id);

ALTER TABLE public.growth_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_resources_select_own ON public.growth_resources;
CREATE POLICY growth_resources_select_own
ON public.growth_resources
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_resources_insert_own ON public.growth_resources;
CREATE POLICY growth_resources_insert_own
ON public.growth_resources
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    linked_vision_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.visions vision
      WHERE vision.id = linked_vision_id
        AND vision.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS growth_resources_update_own ON public.growth_resources;
CREATE POLICY growth_resources_update_own
ON public.growth_resources
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    linked_vision_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.visions vision
      WHERE vision.id = linked_vision_id
        AND vision.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS growth_resources_delete_own ON public.growth_resources;
CREATE POLICY growth_resources_delete_own
ON public.growth_resources
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_skills_manage_own ON public.growth_skills;
CREATE POLICY growth_skills_manage_own
ON public.growth_skills
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS learning_paths_manage_own ON public.learning_paths;
CREATE POLICY learning_paths_manage_own
ON public.learning_paths
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    linked_vision_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.visions vision
      WHERE vision.id = linked_vision_id
        AND vision.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS learning_path_items_manage_own ON public.learning_path_items;
CREATE POLICY learning_path_items_manage_own
ON public.learning_path_items
FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.learning_paths path
    WHERE path.id = learning_path_items.path_id
      AND path.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.learning_paths path
    WHERE path.id = learning_path_items.path_id
      AND path.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_path_items TO authenticated;
