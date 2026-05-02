-- Drop old profiles to recreate linked to auth.users (WARNING: deletes data)
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create a profiles table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT,
  gender TEXT DEFAULT 'prefer_not_say' CHECK (gender IN ('male', 'female', 'prefer_not_say')),
  avatar_url TEXT,
  bio TEXT,
  role TEXT,
  interests TEXT[],
  onboarded BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create Visions table
CREATE TABLE IF NOT EXISTS public.visions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email TEXT, -- Backup identifier
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'in-progress',
  progress INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOCIAL TABLES
-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('update', 'sprint', 'insight', 'milestone', 'achievement')),
  caption TEXT,
  content TEXT,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Media table
CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Saved Posts table
CREATE TABLE IF NOT EXISTS public.saved_posts (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Post Tags table
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL
);

-- Post Mentions table
CREATE TABLE IF NOT EXISTS public.post_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Tasks table (linked to visions)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vision_id UUID REFERENCES public.visions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Todos table (standalone)
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email TEXT,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Safer Policy Creation (Drop if exists then create)
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public Visions Access" ON public.visions;
CREATE POLICY "Public Visions Access" ON public.visions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own visions" ON public.visions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public Tasks Access" ON public.tasks;
CREATE POLICY "Public Tasks Access" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can manage tasks for their visions" ON public.tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.visions WHERE id = vision_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public Todos Access" ON public.todos;
CREATE POLICY "Public Todos Access" ON public.todos FOR ALL USING (auth.uid() = user_id);

-- Social Policies
DROP POLICY IF EXISTS "Anyone can view public posts" ON public.posts;
CREATE POLICY "Anyone can view public posts" ON public.posts FOR SELECT USING (visibility = 'public');
CREATE POLICY "Users can manage their own posts" ON public.posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view post media" ON public.post_media;
CREATE POLICY "Anyone can view post media" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "Users can manage media for their own posts" ON public.post_media FOR ALL USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can view likes" ON public.post_likes;
CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own saves" ON public.saved_posts;
CREATE POLICY "Users can manage their own saves" ON public.saved_posts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comments" ON public.comments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Users can manage their own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view milestones" ON public.milestones;
CREATE POLICY "Anyone can view milestones" ON public.milestones FOR SELECT USING (true);
CREATE POLICY "Users can manage their own milestones" ON public.milestones FOR ALL USING (auth.uid() = user_id);

-- USER CIRCLES
CREATE TABLE IF NOT EXISTS public.user_circles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  circle_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  relation_type TEXT CHECK (relation_type IN ('friend', 'close_friend', 'collaborator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, circle_user_id)
);

-- USER INTERESTS
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

ALTER TABLE public.user_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own circles" ON public.user_circles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own interests" ON public.user_interests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public interest access" ON public.user_interests FOR SELECT USING (true);
CREATE POLICY "Public circle access" ON public.user_circles FOR SELECT USING (true);

-- VISION SHARES
CREATE TABLE IF NOT EXISTS public.vision_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vision_id UUID REFERENCES public.visions(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  receiver_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('like', 'comment', 'follow', 'mention', 'reply')),
  entity_id UUID, 
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MODERATION
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT CHECK (target_type IN ('post', 'comment', 'user')),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ANALYTICS
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON public.post_tags(tag);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_tag ON public.user_interests(tag);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own blocks" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);
CREATE POLICY "Anyone can create a report" ON public.reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "System analytics restricted" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


ALTER TABLE public.vision_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Vision Shares Access" ON public.vision_shares;
CREATE POLICY "Public Vision Shares Access" ON public.vision_shares FOR ALL USING (true) WITH CHECK (true);

-- COMMUNITY SPACES
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
CREATE POLICY "Level five users can create communities" ON public.communities FOR INSERT WITH CHECK (
  auth.uid() = owner_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.level, 1) >= 5
  )
);

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
CREATE POLICY "Members can read community threads" ON public.community_threads FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_members.community_id = community_threads.community_id
      AND community_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can create community threads" ON public.community_threads;
CREATE POLICY "Members can create community threads" ON public.community_threads FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_members.community_id = community_threads.community_id
      AND community_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Thread owners can update threads" ON public.community_threads;
CREATE POLICY "Thread owners can update threads" ON public.community_threads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can read thread messages" ON public.community_thread_messages;
CREATE POLICY "Members can read thread messages" ON public.community_thread_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_threads
    JOIN public.community_members ON community_members.community_id = community_threads.community_id
    WHERE community_threads.id = community_thread_messages.thread_id
      AND community_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can send thread messages" ON public.community_thread_messages;
CREATE POLICY "Members can send thread messages" ON public.community_thread_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.community_threads
    JOIN public.community_members ON community_members.community_id = community_threads.community_id
    WHERE community_threads.id = community_thread_messages.thread_id
      AND community_members.user_id = auth.uid()
  )
);
