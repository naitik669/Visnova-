-- 002_onboarding_rls.sql

-- Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, owner update
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

-- Visions: Owner access
DROP POLICY IF EXISTS "Users can manage their own visions" ON public.visions;
CREATE POLICY "Users can manage their own visions" ON public.visions 
FOR ALL USING (auth.uid() = user_id);

-- Interests: Owner access
DROP POLICY IF EXISTS "Users can manage their own interests" ON public.user_interests;
CREATE POLICY "Users can manage their own interests" ON public.user_interests 
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public interest access" ON public.user_interests;
CREATE POLICY "Public interest access" ON public.user_interests 
FOR SELECT USING (true);
