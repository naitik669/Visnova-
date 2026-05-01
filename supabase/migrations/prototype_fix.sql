-- 🚀 VisNova Prototype Foundation Migration 🚀

-- 1. Profiles (Ensure all columns exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS main_goal TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS focus INTEGER DEFAULT 85;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 72;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mood INTEGER DEFAULT 90;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sleep INTEGER DEFAULT 64;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_note TEXT;

-- 2. Visions (Align with contract)
CREATE TABLE IF NOT EXISTS public.visions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'idea',
  progress INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  proof TEXT[] DEFAULT '{}',
  elements JSONB DEFAULT '[]',
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tasks (Separate table)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vision_id UUID REFERENCES public.visions(id) ON DELETE CASCADE,
  text TEXT,
  completed BOOLEAN DEFAULT false,
  sub_tasks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Todos (Dashboard list)
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Folders
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  color TEXT,
  expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Notes (Merged Journal + Vault)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT,
  note_type TEXT DEFAULT 'vault', -- 'vault' | 'journal'
  tags TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'private',
  linked_vision_id UUID REFERENCES public.visions(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Date Notes
CREATE TABLE IF NOT EXISTS public.date_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_str TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Feed System
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'update',
  caption TEXT,
  content TEXT,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  tag TEXT
);

CREATE TABLE IF NOT EXISTS public.post_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.saved_posts (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag TEXT,
  weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, tag)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. RLS POLICIES (Strict)

-- Disable all by default
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read, users can update self
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Visions: Own or public
DROP POLICY IF EXISTS "Visions access" ON public.visions;
CREATE POLICY "Visions access" ON public.visions FOR ALL USING (auth.uid() = user_id OR visibility = 'public');

-- Tasks/Todos: Own only
DROP POLICY IF EXISTS "Tasks own" ON public.tasks;
CREATE POLICY "Tasks own" ON public.tasks FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Todos own" ON public.todos;
CREATE POLICY "Todos own" ON public.todos FOR ALL USING (auth.uid() = user_id);

-- Notes/Folders: Own only
DROP POLICY IF EXISTS "Notes access" ON public.notes;
CREATE POLICY "Notes access" ON public.notes FOR ALL USING (auth.uid() = user_id OR visibility = 'public');
DROP POLICY IF EXISTS "Folders own" ON public.folders;
CREATE POLICY "Folders own" ON public.folders FOR ALL USING (auth.uid() = user_id);

-- Posts: Public readable, own manageable
DROP POLICY IF EXISTS "Posts public" ON public.posts;
CREATE POLICY "Posts public" ON public.posts FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Posts own" ON public.posts;
CREATE POLICY "Posts own" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Posts manage own" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Posts delete own" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Post Support
DROP POLICY IF EXISTS "Post media access" ON public.post_media;
CREATE POLICY "Post media access" ON public.post_media FOR SELECT USING (true);
DROP POLICY IF EXISTS "Post media manage" ON public.post_media FOR ALL USING (EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Post likes" ON public.post_likes;
CREATE POLICY "Post likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Post likes manage" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

-- Comments
DROP POLICY IF EXISTS "Comments select" ON public.comments;
CREATE POLICY "Comments select" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Comments manage" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- Follows
DROP POLICY IF EXISTS "Follows select" ON public.follows;
CREATE POLICY "Follows select" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Follows manage" ON public.follows FOR ALL USING (follower_id = auth.uid());

-- Notifications
DROP POLICY IF EXISTS "Notifications access" ON public.notifications;
CREATE POLICY "Notifications access" ON public.notifications FOR ALL USING (user_id = auth.uid());
