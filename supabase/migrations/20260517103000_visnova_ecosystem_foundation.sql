-- VisNova ecosystem foundation.
-- Connect existing modules around Vision, Progress, Accountability, Reflection,
-- Resources, Time, and Growth History without deleting or rewriting old data.

-- ---------------------------------------------------------------------------
-- 1. Add optional Vision/task/visibility/metadata links to existing surfaces.
-- ---------------------------------------------------------------------------

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress_log_id uuid,
  ADD COLUMN IF NOT EXISTS proof_summary text;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress_log_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress_log_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resource_type text DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.nova_capsules
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capsule_type text DEFAULT 'future_letter',
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.growth_resources
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.finance_budgets
  ADD COLUMN IF NOT EXISTS linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.finance_reviews
  ADD COLUMN IF NOT EXISTS linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.community_threads
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.community_thread_messages
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. Progress Logs: the bridge between private work and public/circle proof.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.progress_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  log_type text NOT NULL DEFAULT 'progress',
  content text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_items jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_spent_minutes integer,
  blocker text,
  lesson text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT progress_logs_log_type_check CHECK (
    log_type IN ('progress','milestone','lesson','build_update','reflection','help_request','win','blocker')
  ),
  CONSTRAINT progress_logs_visibility_check CHECK (
    visibility IN ('private','circle','connections','public')
  )
);

ALTER TABLE public.posts
  ADD CONSTRAINT posts_progress_log_id_fkey
  FOREIGN KEY (progress_log_id) REFERENCES public.progress_logs(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.posts VALIDATE CONSTRAINT posts_progress_log_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_progress_log_id_fkey
  FOREIGN KEY (progress_log_id) REFERENCES public.progress_logs(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.notifications VALIDATE CONSTRAINT notifications_progress_log_id_fkey;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_progress_log_id_fkey
  FOREIGN KEY (progress_log_id) REFERENCES public.progress_logs(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.activities VALIDATE CONSTRAINT activities_progress_log_id_fkey;

-- ---------------------------------------------------------------------------
-- 3. Growth Timeline: normalized history layer for "Day 1 vs Now".
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.growth_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  progress_log_id uuid REFERENCES public.progress_logs(id) ON DELETE SET NULL,
  source_table text,
  source_id uuid,
  event_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  summary text,
  visibility text NOT NULL DEFAULT 'private',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_timeline_visibility_check CHECK (
    visibility IN ('private','circle','connections','public')
  )
);

-- ---------------------------------------------------------------------------
-- 4. AI Insights: intelligence layer stored privately until user shares.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'next_action',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  action_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'private',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_insights_visibility_check CHECK (
    visibility IN ('private','circle','connections','public')
  )
);

-- ---------------------------------------------------------------------------
-- 5. Indexes for ecosystem queries.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS posts_vision_id_idx ON public.posts(vision_id);
CREATE INDEX IF NOT EXISTS posts_progress_log_id_idx ON public.posts(progress_log_id);
CREATE INDEX IF NOT EXISTS comments_vision_id_idx ON public.comments(vision_id);
CREATE INDEX IF NOT EXISTS messages_vision_id_idx ON public.messages(vision_id);
CREATE INDEX IF NOT EXISTS notifications_vision_id_idx ON public.notifications(vision_id);
CREATE INDEX IF NOT EXISTS activities_progress_log_id_idx ON public.activities(progress_log_id);
CREATE INDEX IF NOT EXISTS todos_vision_id_idx ON public.todos(vision_id);
CREATE INDEX IF NOT EXISTS notes_task_id_idx ON public.notes(task_id);
CREATE INDEX IF NOT EXISTS nova_capsules_vision_id_idx ON public.nova_capsules(vision_id);
CREATE INDEX IF NOT EXISTS milestones_vision_id_idx ON public.milestones(vision_id);
CREATE INDEX IF NOT EXISTS growth_resources_task_id_idx ON public.growth_resources(task_id);
CREATE INDEX IF NOT EXISTS finance_budgets_linked_vision_id_idx ON public.finance_budgets(linked_vision_id);
CREATE INDEX IF NOT EXISTS finance_reviews_linked_vision_id_idx ON public.finance_reviews(linked_vision_id);
CREATE INDEX IF NOT EXISTS community_threads_vision_id_idx ON public.community_threads(vision_id);
CREATE INDEX IF NOT EXISTS community_thread_messages_vision_id_idx ON public.community_thread_messages(vision_id);

CREATE INDEX IF NOT EXISTS progress_logs_user_created_idx ON public.progress_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS progress_logs_vision_created_idx ON public.progress_logs(vision_id, created_at DESC);
CREATE INDEX IF NOT EXISTS progress_logs_visibility_created_idx ON public.progress_logs(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS progress_logs_linked_items_gin_idx ON public.progress_logs USING gin (linked_items);
CREATE INDEX IF NOT EXISTS progress_logs_metadata_gin_idx ON public.progress_logs USING gin (metadata);

CREATE INDEX IF NOT EXISTS growth_timeline_user_created_idx ON public.growth_timeline_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS growth_timeline_vision_created_idx ON public.growth_timeline_events(vision_id, created_at DESC);
CREATE INDEX IF NOT EXISTS growth_timeline_type_idx ON public.growth_timeline_events(event_type);

CREATE INDEX IF NOT EXISTS ai_insights_user_created_idx ON public.ai_insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_insights_vision_created_idx ON public.ai_insights(vision_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Updated-at trigger support.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_progress_logs_updated_at ON public.progress_logs;
CREATE TRIGGER set_progress_logs_updated_at
BEFORE UPDATE ON public.progress_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_ai_insights_updated_at ON public.ai_insights;
CREATE TRIGGER set_ai_insights_updated_at
BEFORE UPDATE ON public.ai_insights
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_milestones_updated_at ON public.milestones;
CREATE TRIGGER set_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. RLS and Data API grants. Explicit grants matter for current Supabase.
-- ---------------------------------------------------------------------------

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS progress_logs_select_ecosystem ON public.progress_logs;
CREATE POLICY progress_logs_select_ecosystem
ON public.progress_logs
FOR SELECT
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR (
    visibility IN ('circle','connections')
    AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE follows.follower_id = auth.uid()
        AND follows.following_id = progress_logs.user_id
    )
  )
);

DROP POLICY IF EXISTS progress_logs_insert_own ON public.progress_logs;
CREATE POLICY progress_logs_insert_own
ON public.progress_logs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    vision_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.visions
      WHERE visions.id = progress_logs.vision_id
        AND visions.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS progress_logs_update_own ON public.progress_logs;
CREATE POLICY progress_logs_update_own
ON public.progress_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS progress_logs_delete_own ON public.progress_logs;
CREATE POLICY progress_logs_delete_own
ON public.progress_logs
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_timeline_select_ecosystem ON public.growth_timeline_events;
CREATE POLICY growth_timeline_select_ecosystem
ON public.growth_timeline_events
FOR SELECT
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR (
    visibility IN ('circle','connections')
    AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE follows.follower_id = auth.uid()
        AND follows.following_id = growth_timeline_events.user_id
    )
  )
);

DROP POLICY IF EXISTS growth_timeline_insert_own ON public.growth_timeline_events;
CREATE POLICY growth_timeline_insert_own
ON public.growth_timeline_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_timeline_update_own ON public.growth_timeline_events;
CREATE POLICY growth_timeline_update_own
ON public.growth_timeline_events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS growth_timeline_delete_own ON public.growth_timeline_events;
CREATE POLICY growth_timeline_delete_own
ON public.growth_timeline_events
FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_insights_select_ecosystem ON public.ai_insights;
CREATE POLICY ai_insights_select_ecosystem
ON public.ai_insights
FOR SELECT
USING (
  auth.uid() = user_id
  OR visibility = 'public'
  OR (
    visibility IN ('circle','connections')
    AND EXISTS (
      SELECT 1 FROM public.follows
      WHERE follows.follower_id = auth.uid()
        AND follows.following_id = ai_insights.user_id
    )
  )
);

DROP POLICY IF EXISTS ai_insights_insert_own ON public.ai_insights;
CREATE POLICY ai_insights_insert_own
ON public.ai_insights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_insights_update_own ON public.ai_insights;
CREATE POLICY ai_insights_update_own
ON public.ai_insights
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_insights_delete_own ON public.ai_insights;
CREATE POLICY ai_insights_delete_own
ON public.ai_insights
FOR DELETE
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_timeline_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;

GRANT SELECT ON public.progress_logs TO anon;
GRANT SELECT ON public.growth_timeline_events TO anon;
GRANT SELECT ON public.ai_insights TO anon;
