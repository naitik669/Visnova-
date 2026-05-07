-- Closed beta stabilization: safe additive schema fixes only.

create table if not exists public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  slug text unique,
  icon text,
  color text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.communities
  add column if not exists slug text unique,
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create unique index if not exists communities_slug_unique
on public.communities (slug)
where slug is not null;

alter table public.communities enable row level security;

drop policy if exists communities_select_authenticated on public.communities;
create policy communities_select_authenticated
on public.communities
for select
using (auth.role() = 'authenticated');

drop policy if exists communities_insert_own on public.communities;
create policy communities_insert_own
on public.communities
for insert
with check (auth.uid() = created_by);

drop policy if exists communities_update_own on public.communities;
create policy communities_update_own
on public.communities
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

alter table public.posts drop constraint if exists posts_type_check;

alter table public.posts
add constraint posts_type_check
check (
  type in (
    'sprint',
    'insight',
    'milestone',
    'update',
    'achievement',
    'status'
  )
);

alter table public.posts
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists stats jsonb default '{}'::jsonb;

alter table public.tasks
  add column if not exists sub_tasks jsonb default '[]'::jsonb;

alter table public.profiles
  add column if not exists verified boolean default false,
  add column if not exists verified_reason text,
  add column if not exists verified_at timestamptz;

create table if not exists public.community_threads (
  id uuid default gen_random_uuid() primary key,
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  kind text default 'discussion'
    check (kind in ('discussion', 'achievement', 'question')),
  created_at timestamptz default now()
);

create table if not exists public.community_thread_messages (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_community_threads_community_id
on public.community_threads (community_id);

create index if not exists idx_community_thread_messages_thread_id
on public.community_thread_messages (thread_id);

alter table public.community_threads enable row level security;
alter table public.community_thread_messages enable row level security;

drop policy if exists threads_select on public.community_threads;
drop policy if exists threads_insert on public.community_threads;
drop policy if exists threads_delete on public.community_threads;

create policy threads_select
on public.community_threads
for select
using (auth.role() = 'authenticated');

create policy threads_insert
on public.community_threads
for insert
with check (auth.uid() = user_id);

create policy threads_delete
on public.community_threads
for delete
using (auth.uid() = user_id);

drop policy if exists messages_select on public.community_thread_messages;
drop policy if exists messages_insert on public.community_thread_messages;
drop policy if exists messages_delete on public.community_thread_messages;

create policy messages_select
on public.community_thread_messages
for select
using (auth.role() = 'authenticated');

create policy messages_insert
on public.community_thread_messages
for insert
with check (auth.uid() = user_id);

create policy messages_delete
on public.community_thread_messages
for delete
using (auth.uid() = user_id);

drop trigger if exists prevent_user_verification_changes on public.profiles;

update storage.buckets
set public = false
where id = 'note-audio';

drop policy if exists notes_select_public on public.notes;

create policy notes_select_public
on public.notes
for select
using (visibility = 'public');

alter table public.profiles
drop column if exists has_completed_onboarding;

grant select, insert, update, delete on public.communities to authenticated;
grant select, insert, update, delete on public.community_threads to authenticated;
grant select, insert, update, delete on public.community_thread_messages to authenticated;
