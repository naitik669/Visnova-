-- 🚀 RUN THIS IN SUPABASE SQL EDITOR TO FIX PERMISSIONS & RLS 🚀

-- 1. Ensure tables exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID references auth.users not null primary key,
  email TEXT,
  full_name TEXT,
  display_name TEXT,
  username TEXT,
  gender TEXT DEFAULT 'prefer_not_say' CHECK (gender IN ('male', 'female', 'custom', 'prefer_not_say')),
  avatar_url TEXT,
  bio TEXT,
  role TEXT,
  interests TEXT[],
  onboarded BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 1,
  onboarding_completed_at TIMESTAMPTZ,
  main_goal TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  is_grinding BOOLEAN DEFAULT false,
  focus INTEGER DEFAULT 85,
  energy INTEGER DEFAULT 72,
  mood INTEGER DEFAULT 90,
  sleep INTEGER DEFAULT 64,
  status_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.visions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'idea',
  progress INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vision_id UUID REFERENCES public.visions ON DELETE CASCADE,
  text TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  text TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.date_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  date_str TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_str),
  UNIQUE(user_email, date_str)
);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'prefer_not_say' CHECK (gender IN ('male', 'female', 'prefer_not_say'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (lower(username))
WHERE username IS NOT NULL AND username <> '';

CREATE OR REPLACE FUNCTION public.is_username_available(candidate_username TEXT, current_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(candidate_username)
      AND (current_user_id IS NULL OR id <> current_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  name TEXT,
  parent_id UUID REFERENCES public.folders,
  color TEXT,
  expanded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  folder_id UUID REFERENCES public.folders ON DELETE SET NULL,
  title TEXT,
  content TEXT,
  tags TEXT[],
  visibility TEXT DEFAULT 'private',
  linked_vision_id UUID REFERENCES public.visions ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS date_notes_user_email_date_idx
ON public.date_notes(user_email, date_str);

CREATE UNIQUE INDEX IF NOT EXISTS date_notes_user_id_date_idx
ON public.date_notes(user_id, date_str);

CREATE TABLE IF NOT EXISTS public.vision_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vision_id UUID REFERENCES public.visions ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  receiver_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.visions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.visions ADD COLUMN IF NOT EXISTS proof TEXT[] DEFAULT '{}';
ALTER TABLE public.visions ADD COLUMN IF NOT EXISTS elements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'::jsonb;

-- 2. Grant permissions to authenticated & anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Enable RLS but add permissive policies so frontend can access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_shares ENABLE ROW LEVEL SECURITY;

-- Allow users to read all profiles (needed for circle/community)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT USING (true);

-- Allow users to insert/update their OWN profile
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Visions policies 
DROP POLICY IF EXISTS "Visions viewable by everyone" ON public.visions;
CREATE POLICY "Visions viewable by everyone" ON public.visions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Visions insertable by owner" ON public.visions;
CREATE POLICY "Visions insertable by owner" ON public.visions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Visions updatable by owner" ON public.visions;
CREATE POLICY "Visions updatable by owner" ON public.visions FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Visions deletable by owner" ON public.visions;
CREATE POLICY "Visions deletable by owner" ON public.visions FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');

-- Tasks policies
DROP POLICY IF EXISTS "Tasks viewable by everyone" ON public.tasks;
CREATE POLICY "Tasks viewable by everyone" ON public.tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Tasks insertable by everyone" ON public.tasks;
CREATE POLICY "Tasks insertable by everyone" ON public.tasks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Tasks updatable by everyone" ON public.tasks;
CREATE POLICY "Tasks updatable by everyone" ON public.tasks FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Tasks deletable by everyone" ON public.tasks;
CREATE POLICY "Tasks deletable by everyone" ON public.tasks FOR DELETE USING (true);

-- Todos policies
DROP POLICY IF EXISTS "Todos viewable by owner" ON public.todos;
CREATE POLICY "Todos viewable by owner" ON public.todos FOR SELECT USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Todos insertable by owner" ON public.todos;
CREATE POLICY "Todos insertable by owner" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Todos updatable by owner" ON public.todos;
CREATE POLICY "Todos updatable by owner" ON public.todos FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Todos deletable by owner" ON public.todos;
CREATE POLICY "Todos deletable by owner" ON public.todos FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');

-- Date Notes policies
DROP POLICY IF EXISTS "Date Notes viewable by owner" ON public.date_notes;
CREATE POLICY "Date Notes viewable by owner" ON public.date_notes FOR SELECT USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Date Notes insertable by owner" ON public.date_notes;
CREATE POLICY "Date Notes insertable by owner" ON public.date_notes FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Date Notes updatable by owner" ON public.date_notes;
CREATE POLICY "Date Notes updatable by owner" ON public.date_notes FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Date Notes deletable by owner" ON public.date_notes;
CREATE POLICY "Date Notes deletable by owner" ON public.date_notes FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');

-- Folders policies
DROP POLICY IF EXISTS "Folders viewable by owner" ON public.folders;
CREATE POLICY "Folders viewable by owner" ON public.folders FOR SELECT USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Folders insertable by owner" ON public.folders;
CREATE POLICY "Folders insertable by owner" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Folders updatable by owner" ON public.folders;
CREATE POLICY "Folders updatable by owner" ON public.folders FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Folders deletable by owner" ON public.folders;
CREATE POLICY "Folders deletable by owner" ON public.folders FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');

-- Notes policies
DROP POLICY IF EXISTS "Notes viewable by everyone" ON public.notes;
CREATE POLICY "Notes viewable by everyone" ON public.notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Notes insertable by owner" ON public.notes;
CREATE POLICY "Notes insertable by owner" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Notes updatable by owner" ON public.notes;
CREATE POLICY "Notes updatable by owner" ON public.notes FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Notes deletable by owner" ON public.notes;
CREATE POLICY "Notes deletable by owner" ON public.notes FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Vision shares viewable by participant" ON public.vision_shares;
CREATE POLICY "Vision shares viewable by participant" ON public.vision_shares
FOR SELECT USING (sender_email = auth.jwt()->>'email' OR receiver_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Vision shares insertable by sender" ON public.vision_shares;
CREATE POLICY "Vision shares insertable by sender" ON public.vision_shares
FOR INSERT WITH CHECK (sender_email = auth.jwt()->>'email');
DROP POLICY IF EXISTS "Vision shares updatable by participant" ON public.vision_shares;
CREATE POLICY "Vision shares updatable by participant" ON public.vision_shares
FOR UPDATE USING (sender_email = auth.jwt()->>'email' OR receiver_email = auth.jwt()->>'email');

-- Community Spaces
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT 'spark',
  color TEXT DEFAULT '#7c3aed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'discussion' CHECK (kind IN ('discussion', 'achievement', 'question')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_thread_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.community_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communities_owner_id ON public.communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_threads_community_id_created ON public.community_threads(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_threads_user_id ON public.community_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_community_thread_messages_thread_id_created ON public.community_thread_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_thread_messages_user_id ON public.community_thread_messages(user_id);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Communities are discoverable" ON public.communities;
CREATE POLICY "Communities are discoverable" ON public.communities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Level five users can create communities" ON public.communities;
CREATE POLICY "Level five users can create communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND COALESCE(profiles.level, 1) >= 5));
DROP POLICY IF EXISTS "Owners can update their communities" ON public.communities;
CREATE POLICY "Owners can update their communities" ON public.communities FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete their communities" ON public.communities;
CREATE POLICY "Owners can delete their communities" ON public.communities FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Community members are visible" ON public.community_members;
CREATE POLICY "Community members are visible" ON public.community_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
CREATE POLICY "Users can join communities" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
CREATE POLICY "Users can leave communities" ON public.community_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can read community threads" ON public.community_threads;
CREATE POLICY "Members can read community threads" ON public.community_threads FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_members WHERE community_members.community_id = community_threads.community_id AND community_members.user_id = auth.uid()));
DROP POLICY IF EXISTS "Members can create community threads" ON public.community_threads;
CREATE POLICY "Members can create community threads" ON public.community_threads FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.community_members WHERE community_members.community_id = community_threads.community_id AND community_members.user_id = auth.uid()));
DROP POLICY IF EXISTS "Thread owners can update threads" ON public.community_threads;
CREATE POLICY "Thread owners can update threads" ON public.community_threads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can read thread messages" ON public.community_thread_messages;
CREATE POLICY "Members can read thread messages" ON public.community_thread_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_threads JOIN public.community_members ON community_members.community_id = community_threads.community_id WHERE community_threads.id = community_thread_messages.thread_id AND community_members.user_id = auth.uid()));
DROP POLICY IF EXISTS "Members can send thread messages" ON public.community_thread_messages;
CREATE POLICY "Members can send thread messages" ON public.community_thread_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.community_threads JOIN public.community_members ON community_members.community_id = community_threads.community_id WHERE community_threads.id = community_thread_messages.thread_id AND community_members.user_id = auth.uid()));

