-- Make the Vision Board execution blueprint persist task priority and manual ordering.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'low'
  CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS tasks_vision_sort_order_idx
ON public.tasks (vision_id, sort_order, created_at);
