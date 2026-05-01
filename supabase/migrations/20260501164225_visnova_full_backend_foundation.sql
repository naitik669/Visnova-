-- VisNova full backend foundation.
-- Applied to Supabase project mmzlgntkhkeextqjaagi on 2026-05-01.

create schema if not exists app_private;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = app_private, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1), 'user_' || left(new.id::text, 8)), '[^a-z0-9_.]', '', 'g'));

  insert into public.profiles (
    id, email, full_name, display_name, username, avatar_url,
    onboarded, onboarding_step, xp, level, streak
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Explorer'),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Explorer'),
    nullif(base_username, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/shapes/svg?seed=' || new.id::text),
    false, 0, 0, 1, 0
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null default '',
  full_name text,
  display_name text,
  username text,
  gender text default 'custom',
  avatar_url text,
  bio text,
  role text default 'Explorer',
  rank text,
  interests text[] default '{}',
  main_goal text,
  onboarded boolean default false,
  onboarding_step integer default 0,
  onboarding_completed_at timestamptz,
  focus integer default 85,
  energy integer default 72,
  mood integer default 90,
  sleep integer default 64,
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  is_grinding boolean default false,
  status_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists gender text default 'custom';
alter table public.profiles add column if not exists rank text;
alter table public.profiles add column if not exists main_goal text;
alter table public.profiles add column if not exists onboarding_step integer default 0;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists focus integer default 85;
alter table public.profiles add column if not exists energy integer default 72;
alter table public.profiles add column if not exists mood integer default 90;
alter table public.profiles add column if not exists sleep integer default 64;
alter table public.profiles add column if not exists xp integer default 0;
alter table public.profiles add column if not exists level integer default 1;
alter table public.profiles add column if not exists streak integer default 0;
alter table public.profiles add column if not exists is_grinding boolean default false;
alter table public.profiles add column if not exists status_note text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

create unique index if not exists profiles_username_unique_idx on public.profiles (lower(username)) where username is not null and username <> '';

create or replace function public.is_username_available(candidate_username text, current_user_id uuid default null)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(candidate_username)
      and (current_user_id is null or id <> current_user_id)
  );
$$;

grant execute on function public.is_username_available(text, uuid) to anon, authenticated;

create table if not exists public.visions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  user_email text,
  title text not null,
  description text,
  status text default 'idea',
  progress integer default 0,
  category text,
  color text,
  tags text[] default '{}',
  notes text default '',
  proof text[] default '{}',
  elements jsonb default '[]'::jsonb,
  visibility text default 'private',
  publish_settings jsonb default '{}'::jsonb,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.visions add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.visions add column if not exists category text;
alter table public.visions add column if not exists color text;
alter table public.visions add column if not exists notes text default '';
alter table public.visions add column if not exists proof text[] default '{}';
alter table public.visions add column if not exists elements jsonb default '[]'::jsonb;
alter table public.visions add column if not exists visibility text default 'private';
alter table public.visions add column if not exists publish_settings jsonb default '{}'::jsonb;
alter table public.visions add column if not exists is_published boolean default false;
alter table public.visions add column if not exists updated_at timestamptz default now();

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  vision_id uuid references public.visions(id) on delete cascade,
  text text not null,
  completed boolean default false,
  priority text,
  sub_tasks jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.tasks add column if not exists priority text;
alter table public.tasks add column if not exists sub_tasks jsonb default '[]'::jsonb;
alter table public.tasks add column if not exists updated_at timestamptz default now();

create table if not exists public.todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  user_email text,
  text text not null,
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.todos add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.todos add column if not exists updated_at timestamptz default now();

create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  color text,
  expanded boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Untitled Note',
  content text not null default '',
  note_type text not null default 'library',
  tags text[] default '{}',
  visibility text default 'private',
  linked_vision_id uuid references public.visions(id) on delete set null,
  is_pinned boolean default false,
  is_favorite boolean default false,
  is_deleted boolean default false,
  mood text,
  journal_date date,
  location text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.date_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date_str text not null,
  note text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date_str)
);

create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  description text not null,
  vision_id uuid references public.visions(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'update',
  caption text,
  content text default '',
  visibility text default 'public',
  metadata jsonb default '{}'::jsonb,
  stats jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.posts add column if not exists stats jsonb default '{}'::jsonb;

create table if not exists public.post_media (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  media_url text not null,
  media_type text not null default 'image',
  storage_path text,
  created_at timestamptz default now()
);

create table if not exists public.post_tags (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  tag text not null
);

create table if not exists public.post_mentions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  mentioned_user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, mentioned_user_id)
);

create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists public.saved_posts (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.user_interests (
  user_id uuid references public.profiles(id) on delete cascade not null,
  tag text not null,
  weight numeric default 1.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, tag)
);

create table if not exists public.user_circles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  circle_user_id uuid references public.profiles(id) on delete cascade not null,
  relation_type text not null default 'friend',
  created_at timestamptz default now(),
  unique (user_id, circle_user_id),
  check (user_id <> circle_user_id)
);

create table if not exists public.vision_shares (
  id uuid default gen_random_uuid() primary key,
  vision_id uuid references public.visions(id) on delete cascade,
  sender_email text not null,
  receiver_email text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  entity_id uuid,
  content text,
  message text not null default '',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  target_id uuid not null,
  target_type text not null,
  reason text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.user_blocks (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.analytics_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  achieved_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.milestones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  target_date date,
  completed_at timestamptz,
  progress integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_username on public.profiles (lower(username));
create index if not exists idx_visions_user_id on public.visions(user_id);
create index if not exists idx_tasks_vision_id on public.tasks(vision_id);
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_todos_user_id on public.todos(user_id);
create index if not exists idx_notes_user_id_type on public.notes(user_id, note_type);
create index if not exists idx_notes_folder_id on public.notes(folder_id);
create index if not exists idx_folders_user_id on public.folders(user_id);
create index if not exists idx_date_notes_user_date on public.date_notes(user_id, date_str);
create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_visibility_created_at on public.posts(visibility, created_at desc);
create index if not exists idx_post_media_post_id on public.post_media(post_id);
create index if not exists idx_post_tags_post_id on public.post_tags(post_id);
create index if not exists idx_post_tags_tag on public.post_tags(lower(tag));
create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_follows_follower_id on public.follows(follower_id);
create index if not exists idx_follows_following_id on public.follows(following_id);
create index if not exists idx_user_interests_tag on public.user_interests(lower(tag));
create index if not exists idx_notifications_user_id_read on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_user_blocks_blocker_id on public.user_blocks(blocker_id);
create index if not exists idx_analytics_events_user_type on public.analytics_events(user_id, event_type);

update public.visions v
set user_id = p.id
from public.profiles p
where v.user_id is null and v.user_email is not null and lower(v.user_email) = lower(p.email);

update public.todos t
set user_id = p.id
from public.profiles p
where t.user_id is null and t.user_email is not null and lower(t.user_email) = lower(p.email);

update public.tasks t
set user_id = v.user_id
from public.visions v
where t.user_id is null and t.vision_id = v.id;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles','visions','tasks','todos','folders','notes','date_notes','activities','posts','post_media','post_tags','post_mentions','post_likes','saved_posts','comments','follows','user_interests','user_circles','vision_shares','notifications','reports','user_blocks','analytics_events','achievements','milestones'
  ] loop
    execute format('alter table public.%I enable row level security', target_table);
  end loop;
end $$;

do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','visions','tasks','todos','folders','notes','date_notes','activities','posts','post_media','post_tags','post_mentions','post_likes','saved_posts','comments','follows','user_interests','user_circles','vision_shares','notifications','reports','user_blocks','analytics_events','achievements','milestones')
  loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
end $$;

create policy profiles_select_public on public.profiles for select using (true);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy visions_select on public.visions for select using (auth.uid() = user_id or visibility = 'public');
create policy visions_insert_own on public.visions for insert with check (auth.uid() = user_id);
create policy visions_update_own on public.visions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy visions_delete_own on public.visions for delete using (auth.uid() = user_id);
create policy tasks_select_own on public.tasks for select using (auth.uid() = user_id or exists (select 1 from public.visions v where v.id = tasks.vision_id and (v.user_id = auth.uid() or v.visibility = 'public')));
create policy tasks_insert_own on public.tasks for insert with check (auth.uid() = user_id or exists (select 1 from public.visions v where v.id = tasks.vision_id and v.user_id = auth.uid()));
create policy tasks_update_own on public.tasks for update using (auth.uid() = user_id or exists (select 1 from public.visions v where v.id = tasks.vision_id and v.user_id = auth.uid())) with check (auth.uid() = user_id or exists (select 1 from public.visions v where v.id = tasks.vision_id and v.user_id = auth.uid()));
create policy tasks_delete_own on public.tasks for delete using (auth.uid() = user_id or exists (select 1 from public.visions v where v.id = tasks.vision_id and v.user_id = auth.uid()));
create policy todos_manage_own on public.todos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy folders_manage_own on public.folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notes_select on public.notes for select using (auth.uid() = user_id or visibility = 'public');
create policy notes_insert_own on public.notes for insert with check (auth.uid() = user_id);
create policy notes_update_own on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notes_delete_own on public.notes for delete using (auth.uid() = user_id);
create policy date_notes_manage_own on public.date_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy activities_manage_own on public.activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy posts_select_public on public.posts for select using (visibility = 'public' or auth.uid() = user_id);
create policy posts_insert_own on public.posts for insert with check (auth.uid() = user_id);
create policy posts_update_own on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy posts_delete_own on public.posts for delete using (auth.uid() = user_id);
create policy post_media_select_visible on public.post_media for select using (exists (select 1 from public.posts p where p.id = post_media.post_id and (p.visibility = 'public' or p.user_id = auth.uid())));
create policy post_media_insert_own on public.post_media for insert with check (exists (select 1 from public.posts p where p.id = post_media.post_id and p.user_id = auth.uid()));
create policy post_media_update_own on public.post_media for update using (exists (select 1 from public.posts p where p.id = post_media.post_id and p.user_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_media.post_id and p.user_id = auth.uid()));
create policy post_media_delete_own on public.post_media for delete using (exists (select 1 from public.posts p where p.id = post_media.post_id and p.user_id = auth.uid()));
create policy post_tags_select_visible on public.post_tags for select using (exists (select 1 from public.posts p where p.id = post_tags.post_id and (p.visibility = 'public' or p.user_id = auth.uid())));
create policy post_tags_insert_own on public.post_tags for insert with check (exists (select 1 from public.posts p where p.id = post_tags.post_id and p.user_id = auth.uid()));
create policy post_tags_delete_own on public.post_tags for delete using (exists (select 1 from public.posts p where p.id = post_tags.post_id and p.user_id = auth.uid()));
create policy post_mentions_select_visible on public.post_mentions for select using (exists (select 1 from public.posts p where p.id = post_mentions.post_id and (p.visibility = 'public' or p.user_id = auth.uid())));
create policy post_mentions_insert_own on public.post_mentions for insert with check (exists (select 1 from public.posts p where p.id = post_mentions.post_id and p.user_id = auth.uid()));
create policy post_mentions_delete_own on public.post_mentions for delete using (exists (select 1 from public.posts p where p.id = post_mentions.post_id and p.user_id = auth.uid()));
create policy post_likes_select_public on public.post_likes for select using (true);
create policy post_likes_insert_own on public.post_likes for insert with check (auth.uid() = user_id);
create policy post_likes_delete_own on public.post_likes for delete using (auth.uid() = user_id);
create policy saved_posts_select_own on public.saved_posts for select using (auth.uid() = user_id);
create policy saved_posts_insert_own on public.saved_posts for insert with check (auth.uid() = user_id);
create policy saved_posts_delete_own on public.saved_posts for delete using (auth.uid() = user_id);
create policy comments_select_visible on public.comments for select using (exists (select 1 from public.posts p where p.id = comments.post_id and (p.visibility = 'public' or p.user_id = auth.uid())));
create policy comments_insert_visible on public.comments for insert with check (auth.uid() = user_id and exists (select 1 from public.posts p where p.id = comments.post_id and (p.visibility = 'public' or p.user_id = auth.uid())));
create policy comments_update_own on public.comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy comments_delete_own on public.comments for delete using (auth.uid() = user_id);
create policy follows_select_public on public.follows for select using (true);
create policy follows_insert_own on public.follows for insert with check (auth.uid() = follower_id);
create policy follows_delete_own on public.follows for delete using (auth.uid() = follower_id);
create policy user_interests_select_own on public.user_interests for select using (auth.uid() = user_id);
create policy user_interests_insert_own on public.user_interests for insert with check (auth.uid() = user_id);
create policy user_interests_update_own on public.user_interests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_interests_delete_own on public.user_interests for delete using (auth.uid() = user_id);
create policy user_circles_select_public on public.user_circles for select using (true);
create policy user_circles_manage_own on public.user_circles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy vision_shares_select_related on public.vision_shares for select using (sender_email = auth.email() or receiver_email = auth.email() or exists (select 1 from public.visions v where v.id = vision_shares.vision_id and v.user_id = auth.uid()));
create policy vision_shares_insert_owner on public.vision_shares for insert with check (exists (select 1 from public.visions v where v.id = vision_shares.vision_id and v.user_id = auth.uid()));
create policy vision_shares_update_receiver on public.vision_shares for update using (receiver_email = auth.email() or exists (select 1 from public.visions v where v.id = vision_shares.vision_id and v.user_id = auth.uid())) with check (receiver_email = auth.email() or exists (select 1 from public.visions v where v.id = vision_shares.vision_id and v.user_id = auth.uid()));
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
create policy notifications_insert_actor on public.notifications for insert with check (auth.uid() = actor_id);
create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete_own on public.notifications for delete using (auth.uid() = user_id);
create policy reports_insert_authenticated on public.reports for insert with check (auth.uid() = reporter_id);
create policy reports_select_own on public.reports for select using (auth.uid() = reporter_id);
create policy user_blocks_select_own on public.user_blocks for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);
create policy user_blocks_manage_own on public.user_blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy analytics_insert_own on public.analytics_events for insert with check (auth.uid() = user_id);
create policy analytics_select_own on public.analytics_events for select using (auth.uid() = user_id);
create policy achievements_select_public on public.achievements for select using (true);
create policy achievements_manage_own on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy milestones_select_public on public.milestones for select using (true);
create policy milestones_manage_own on public.milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
declare
  t text;
begin
  foreach t in array array['profiles','visions','tasks','todos','folders','notes','date_notes','posts','comments','user_interests'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function app_private.set_updated_at()', t, t);
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  10485760,
  array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy post_images_insert_own_folder on storage.objects for insert with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy post_images_update_own_folder on storage.objects for update using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy post_images_delete_own_folder on storage.objects for delete using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
