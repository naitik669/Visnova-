-- Stabilize VisNova private productivity modules:
-- Vision Boards, Notes/Vault, Journal, and Nova Clock.
-- Safe to rerun: no user data is dropped.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.visions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'idea',
  progress integer DEFAULT 0,
  category text,
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  proof text[] DEFAULT '{}',
  elements jsonb DEFAULT '[]'::jsonb,
  visibility text DEFAULT 'private',
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.visions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS proof text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS elements jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  vision_id uuid REFERENCES public.visions(id) ON DELETE CASCADE,
  text text NOT NULL,
  completed boolean DEFAULT false,
  priority text DEFAULT 'low',
  sort_order integer DEFAULT 0,
  sub_tasks jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS vision_id uuid REFERENCES public.visions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS text text,
  ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_tasks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'low';
ALTER TABLE public.tasks ALTER COLUMN sort_order SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  color text,
  expanded boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  title text DEFAULT 'Untitled Note',
  content text DEFAULT '',
  note_type text DEFAULT 'vault',
  tags text[] DEFAULT '{}',
  visibility text DEFAULT 'private',
  linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  is_pinned boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  mood text,
  journal_date date,
  location text,
  image_url text,
  audio_path text,
  audio_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text DEFAULT 'Untitled Note',
  ADD COLUMN IF NOT EXISTS content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS note_type text DEFAULT 'vault',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS linked_vision_id uuid REFERENCES public.visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS journal_date date,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.notes ALTER COLUMN note_type SET DEFAULT 'vault';
UPDATE public.notes SET note_type = 'vault' WHERE note_type = 'library';

CREATE TABLE IF NOT EXISTS public.nova_capsules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  status text DEFAULT 'draft',
  unlock_at timestamptz NOT NULL,
  notify boolean DEFAULT true,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nova_capsule_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  capsule_id uuid NOT NULL REFERENCES public.nova_capsules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  source_id uuid,
  title text,
  content text,
  media_url text,
  storage_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nova_capsules
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS unlock_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.nova_capsule_items
  ADD COLUMN IF NOT EXISTS item_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.visions DROP CONSTRAINT IF EXISTS visions_status_check;
ALTER TABLE public.visions
  ADD CONSTRAINT visions_status_check CHECK (status IN ('idea', 'planning', 'in-progress', 'completed'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_note_type_check;
ALTER TABLE public.notes
  ADD CONSTRAINT notes_note_type_check CHECK (note_type IN ('vault', 'journal'));

ALTER TABLE public.nova_capsules DROP CONSTRAINT IF EXISTS nova_capsules_status_check;
ALTER TABLE public.nova_capsules
  ADD CONSTRAINT nova_capsules_status_check CHECK (status IN ('draft', 'locked', 'unlocked', 'opened'));

ALTER TABLE public.nova_capsule_items DROP CONSTRAINT IF EXISTS nova_capsule_items_item_type_check;
ALTER TABLE public.nova_capsule_items
  ADD CONSTRAINT nova_capsule_items_item_type_check CHECK (item_type IN ('note', 'journal', 'task', 'vision', 'milestone', 'achievement', 'image', 'file', 'text'));

CREATE INDEX IF NOT EXISTS idx_visions_user_id ON public.visions(user_id);
CREATE INDEX IF NOT EXISTS idx_visions_user_updated_at ON public.visions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_vision_sort_order ON public.tasks(vision_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id_type ON public.notes(user_id, note_type);
CREATE INDEX IF NOT EXISTS idx_notes_journal_date ON public.notes(user_id, journal_date) WHERE note_type = 'journal';
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS nova_capsules_user_id_idx ON public.nova_capsules(user_id);
CREATE INDEX IF NOT EXISTS nova_capsules_unlock_at_idx ON public.nova_capsules(unlock_at);
CREATE INDEX IF NOT EXISTS nova_capsule_items_capsule_id_idx ON public.nova_capsule_items(capsule_id);

ALTER TABLE public.visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_capsule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visions_select ON public.visions;
CREATE POLICY visions_select ON public.visions
FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

DROP POLICY IF EXISTS visions_insert_own ON public.visions;
CREATE POLICY visions_insert_own ON public.visions
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS visions_update_own ON public.visions;
CREATE POLICY visions_update_own ON public.visions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS visions_delete_own ON public.visions;
CREATE POLICY visions_delete_own ON public.visions
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
CREATE POLICY tasks_select_own ON public.tasks
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
CREATE POLICY tasks_insert_own ON public.tasks
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
CREATE POLICY tasks_update_own ON public.tasks
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
CREATE POLICY tasks_delete_own ON public.tasks
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS folders_manage_own ON public.folders;
CREATE POLICY folders_manage_own ON public.folders
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notes_select ON public.notes;
CREATE POLICY notes_select ON public.notes
FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

DROP POLICY IF EXISTS notes_insert_own ON public.notes;
CREATE POLICY notes_insert_own ON public.notes
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notes_update_own ON public.notes;
CREATE POLICY notes_update_own ON public.notes
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notes_delete_own ON public.notes;
CREATE POLICY notes_delete_own ON public.notes
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_select_own ON public.nova_capsules;
CREATE POLICY nova_capsules_select_own ON public.nova_capsules
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_insert_own ON public.nova_capsules;
CREATE POLICY nova_capsules_insert_own ON public.nova_capsules
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_update_own ON public.nova_capsules;
CREATE POLICY nova_capsules_update_own ON public.nova_capsules
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsules_delete_own ON public.nova_capsules;
CREATE POLICY nova_capsules_delete_own ON public.nova_capsules
FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nova_capsule_items_select_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_select_own ON public.nova_capsule_items
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_insert_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_insert_own ON public.nova_capsule_items
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_update_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_update_own ON public.nova_capsule_items
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
      AND c.user_id = auth.uid()
  )
) WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS nova_capsule_items_delete_own ON public.nova_capsule_items;
CREATE POLICY nova_capsule_items_delete_own ON public.nova_capsule_items
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.nova_capsules c
    WHERE c.id = nova_capsule_items.capsule_id
      AND c.user_id = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('note-audio', 'note-audio', false, 26214400, ARRAY['audio/webm','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/wav','audio/x-wav','audio/wave','audio/ogg','application/ogg']),
  ('nova-capsules', 'nova-capsules', false, 10485760, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS note_audio_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS note_audio_storage_select_own ON storage.objects;
CREATE POLICY note_audio_storage_select_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS note_audio_storage_insert_own ON storage.objects;
CREATE POLICY note_audio_storage_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS note_audio_storage_update_own ON storage.objects;
CREATE POLICY note_audio_storage_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS note_audio_storage_delete_own ON storage.objects;
CREATE POLICY note_audio_storage_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS nova_capsules_storage_public_read ON storage.objects;
DROP POLICY IF EXISTS nova_capsules_storage_select_own ON storage.objects;
CREATE POLICY nova_capsules_storage_select_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS nova_capsules_storage_insert_own ON storage.objects;
CREATE POLICY nova_capsules_storage_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS nova_capsules_storage_update_own ON storage.objects;
CREATE POLICY nova_capsules_storage_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS nova_capsules_storage_delete_own ON storage.objects;
CREATE POLICY nova_capsules_storage_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'nova-capsules' AND auth.uid()::text = (storage.foldername(name))[1]);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_capsules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_capsule_items TO authenticated;
GRANT SELECT ON public.notes TO anon;
