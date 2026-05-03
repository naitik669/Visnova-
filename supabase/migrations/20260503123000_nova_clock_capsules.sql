-- Nova Clock: user-owned virtual time capsules.

CREATE TABLE IF NOT EXISTS public.nova_capsules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'unlocked', 'opened')),
  unlock_at TIMESTAMPTZ NOT NULL,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nova_capsule_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id UUID NOT NULL REFERENCES public.nova_capsules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('note', 'journal', 'task', 'vision', 'milestone', 'achievement', 'image', 'file', 'text')),
  source_id UUID,
  title TEXT,
  content TEXT,
  media_url TEXT,
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nova_capsule_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id UUID NOT NULL REFERENCES public.nova_capsules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
ON public.nova_capsules FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_insert_own ON public.nova_capsules;
CREATE POLICY nova_capsules_insert_own
ON public.nova_capsules FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_update_own ON public.nova_capsules;
CREATE POLICY nova_capsules_update_own
ON public.nova_capsules FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_delete_own ON public.nova_capsules;
CREATE POLICY nova_capsules_delete_own
ON public.nova_capsules FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsule_items_select_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_select_own
ON public.nova_capsule_items FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
    AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_insert_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_insert_own
ON public.nova_capsule_items FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
    AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_update_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_update_own
ON public.nova_capsule_items FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
    AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_delete_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_delete_own
ON public.nova_capsule_items FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsule_notifications_manage_own ON public.nova_capsule_notifications;
CREATE POLICY nova_capsule_notifications_manage_own
ON public.nova_capsule_notifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nova-capsules',
  'nova-capsules',
  FALSE,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS nova_capsules_storage_select_own ON storage.objects;
CREATE POLICY nova_capsules_storage_select_own
ON storage.objects FOR SELECT
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS nova_capsules_storage_insert_own ON storage.objects;
CREATE POLICY nova_capsules_storage_insert_own
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'nova-capsules'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS nova_capsules_storage_update_own ON storage.objects;
CREATE POLICY nova_capsules_storage_update_own
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
)
WITH CHECK (
  bucket_id = 'nova-capsules'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS nova_capsules_storage_delete_own ON storage.objects;
CREATE POLICY nova_capsules_storage_delete_own
ON storage.objects FOR DELETE
USING (
  bucket_id = 'nova-capsules'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
