-- Ensure Nova Clock exists in live Supabase even if the older capsule migration was skipped.
-- This is intentionally self-contained and safe for existing NovaCapsule data.

CREATE TABLE IF NOT EXISTS public.nova_capsules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'unlocked', 'opened')),
  unlock_at timestamptz NOT NULL,
  notify boolean NOT NULL DEFAULT true,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nova_capsule_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id uuid NOT NULL REFERENCES public.nova_capsules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('note', 'journal', 'task', 'vision', 'milestone', 'achievement', 'image', 'file', 'text')),
  source_id uuid,
  title text,
  content text,
  media_url text,
  storage_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nova_capsule_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id uuid NOT NULL REFERENCES public.nova_capsules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nova_capsules_user_id_idx ON public.nova_capsules(user_id);
CREATE INDEX IF NOT EXISTS nova_capsules_status_idx ON public.nova_capsules(status);
CREATE INDEX IF NOT EXISTS nova_capsules_unlock_at_idx ON public.nova_capsules(unlock_at);
CREATE INDEX IF NOT EXISTS nova_capsule_items_capsule_id_idx ON public.nova_capsule_items(capsule_id);
CREATE INDEX IF NOT EXISTS nova_capsule_items_user_id_idx ON public.nova_capsule_items(user_id);
CREATE INDEX IF NOT EXISTS nova_capsule_notifications_user_id_idx ON public.nova_capsule_notifications(user_id);

ALTER TABLE public.nova_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_capsule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_capsule_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nova_capsules_select_own ON public.nova_capsules;
CREATE POLICY nova_capsules_select_own
ON public.nova_capsules
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_insert_own ON public.nova_capsules;
CREATE POLICY nova_capsules_insert_own
ON public.nova_capsules
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_update_own ON public.nova_capsules;
CREATE POLICY nova_capsules_update_own
ON public.nova_capsules
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_delete_own ON public.nova_capsules;
CREATE POLICY nova_capsules_delete_own
ON public.nova_capsules
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsule_items_select_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_select_own
ON public.nova_capsule_items
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.nova_capsules capsule
    WHERE capsule.id = nova_capsule_items.capsule_id
      AND capsule.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_insert_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_insert_own
ON public.nova_capsule_items
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.nova_capsules capsule
    WHERE capsule.id = nova_capsule_items.capsule_id
      AND capsule.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_update_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_update_own
ON public.nova_capsule_items
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.nova_capsules capsule
    WHERE capsule.id = nova_capsule_items.capsule_id
      AND capsule.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_delete_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_delete_own
ON public.nova_capsule_items
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsule_notifications_manage_own ON public.nova_capsule_notifications;
CREATE POLICY nova_capsule_notifications_manage_own
ON public.nova_capsule_notifications
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_capsules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_capsule_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_capsule_notifications TO authenticated;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'nova-capsules',
  'nova-capsules',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS nova_capsules_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS nova_capsules_storage_select_own ON storage.objects;
CREATE POLICY nova_capsules_storage_select_own
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_insert_own ON storage.objects;
CREATE POLICY nova_capsules_storage_insert_own
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_update_own ON storage.objects;
CREATE POLICY nova_capsules_storage_update_own
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS nova_capsules_storage_delete_own ON storage.objects;
CREATE POLICY nova_capsules_storage_delete_own
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
