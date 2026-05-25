-- VisNova social accountability MVP: privacy preferences, Weekly Proof Sprints, and nudges.
-- Safe additive migration. Does not drop user data.

alter table public.notifications
  add column if not exists entity_id uuid,
  add column if not exists content text;

alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts
  add constraint posts_type_check
  check (type in ('sprint', 'insight', 'milestone', 'update', 'achievement', 'status', 'help_request'));

create table if not exists public.accountability_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  show_in_circle_momentum boolean not null default true,
  momentum_visibility text not null default 'circle',
  momentum_detail_level text not null default 'score_only',
  allow_nudges boolean not null default true,
  allow_proof_requests boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accountability_preferences
  drop constraint if exists accountability_preferences_momentum_visibility_check,
  add constraint accountability_preferences_momentum_visibility_check
  check (momentum_visibility in ('circle', 'public', 'hidden'));

alter table public.accountability_preferences
  drop constraint if exists accountability_preferences_momentum_detail_level_check,
  add constraint accountability_preferences_momentum_detail_level_check
  check (momentum_detail_level in ('score_only', 'counts'));

create table if not exists public.weekly_proof_sprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  linked_vision_id uuid references public.visions(id) on delete set null,
  target_logs integer not null default 3 check (target_logs >= 0 and target_logs <= 30),
  target_tasks integer not null default 0 check (target_tasks >= 0 and target_tasks <= 100),
  visibility text not null default 'private' check (visibility in ('private', 'circle', 'public')),
  week_start date not null,
  week_end date not null,
  current_logs integer not null default 0,
  current_tasks integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'almost_there', 'missed', 'restarted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  nudge_type text not null default 'encouragement' check (nudge_type in ('encouragement', 'ask_update', 'sprint_reminder', 'offer_help', 'celebrate_progress')),
  message text,
  linked_vision_id uuid references public.visions(id) on delete set null,
  linked_task_id uuid references public.tasks(id) on delete set null,
  nudge_date date not null default current_date,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  check (from_user_id <> to_user_id)
);

create unique index if not exists nudges_one_per_sender_receiver_day_idx
  on public.nudges(from_user_id, to_user_id, nudge_date);

create index if not exists weekly_proof_sprints_user_week_idx
  on public.weekly_proof_sprints(user_id, week_start desc);

create index if not exists weekly_proof_sprints_visibility_idx
  on public.weekly_proof_sprints(visibility, week_start desc);

create index if not exists nudges_to_user_idx
  on public.nudges(to_user_id, created_at desc);

create index if not exists nudges_from_user_idx
  on public.nudges(from_user_id, created_at desc);

create or replace function public.is_circle_connection(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() <> target_user_id
    and (
      exists (
        select 1 from public.follows
        where follower_id = auth.uid()
          and following_id = target_user_id
      )
      or exists (
        select 1 from public.follows
        where follower_id = target_user_id
          and following_id = auth.uid()
      )
      or exists (
        select 1 from public.user_circles
        where user_id = auth.uid()
          and circle_user_id = target_user_id
      )
      or exists (
        select 1 from public.user_circles
        where user_id = target_user_id
          and circle_user_id = auth.uid()
      )
    );
$$;

alter table public.accountability_preferences enable row level security;
alter table public.weekly_proof_sprints enable row level security;
alter table public.nudges enable row level security;

drop policy if exists accountability_preferences_select_own on public.accountability_preferences;
create policy accountability_preferences_select_own
on public.accountability_preferences for select
using (auth.uid() = user_id);

drop policy if exists accountability_preferences_insert_own on public.accountability_preferences;
create policy accountability_preferences_insert_own
on public.accountability_preferences for insert
with check (auth.uid() = user_id);

drop policy if exists accountability_preferences_update_own on public.accountability_preferences;
create policy accountability_preferences_update_own
on public.accountability_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists weekly_proof_sprints_select_safe on public.weekly_proof_sprints;
create policy weekly_proof_sprints_select_safe
on public.weekly_proof_sprints for select
using (
  auth.uid() = user_id
  or visibility = 'public'
  or (
    visibility = 'circle'
    and public.is_circle_connection(user_id)
    and exists (
      select 1
      from public.accountability_preferences ap
      where ap.user_id = weekly_proof_sprints.user_id
        and ap.show_in_circle_momentum = true
        and ap.momentum_visibility in ('circle', 'public')
    )
  )
);

drop policy if exists weekly_proof_sprints_insert_own on public.weekly_proof_sprints;
create policy weekly_proof_sprints_insert_own
on public.weekly_proof_sprints for insert
with check (auth.uid() = user_id);

drop policy if exists weekly_proof_sprints_update_own on public.weekly_proof_sprints;
create policy weekly_proof_sprints_update_own
on public.weekly_proof_sprints for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists weekly_proof_sprints_delete_own on public.weekly_proof_sprints;
create policy weekly_proof_sprints_delete_own
on public.weekly_proof_sprints for delete
using (auth.uid() = user_id);

drop policy if exists nudges_select_sender_receiver on public.nudges;
create policy nudges_select_sender_receiver
on public.nudges for select
using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists nudges_insert_circle_allowed on public.nudges;
create policy nudges_insert_circle_allowed
on public.nudges for insert
with check (
  auth.uid() = from_user_id
  and public.is_circle_connection(to_user_id)
  and coalesce((
    select ap.allow_nudges
    from public.accountability_preferences ap
    where ap.user_id = to_user_id
  ), true) = true
);

drop policy if exists nudges_update_receiver on public.nudges;
create policy nudges_update_receiver
on public.nudges for update
using (auth.uid() = to_user_id)
with check (auth.uid() = to_user_id);

grant select, insert, update, delete on public.accountability_preferences to authenticated;
grant select, insert, update, delete on public.weekly_proof_sprints to authenticated;
grant select, insert, update on public.nudges to authenticated;
