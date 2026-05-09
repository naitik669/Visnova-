-- Guard task completion XP so each task can only reward once.

alter table public.tasks
  add column if not exists completed_at timestamptz,
  add column if not exists xp_awarded boolean default false,
  add column if not exists xp_awarded_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.todos
  add column if not exists completed_at timestamptz,
  add column if not exists xp_awarded boolean default false,
  add column if not exists xp_awarded_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.tasks
set completed_at = coalesce(updated_at, created_at, now())
where completed = true
  and completed_at is null;

update public.todos
set completed_at = coalesce(updated_at, created_at, now())
where completed = true
  and completed_at is null;

update public.tasks
set xp_awarded = true,
    xp_awarded_at = coalesce(completed_at, updated_at, created_at, now())
where completed = true
  and coalesce(xp_awarded, false) = false;

update public.todos
set xp_awarded = true,
    xp_awarded_at = coalesce(completed_at, updated_at, created_at, now())
where completed = true
  and coalesce(xp_awarded, false) = false;

create table if not exists public.xp_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  xp_amount integer not null check (xp_amount > 0 and xp_amount <= 1000),
  reason text,
  created_at timestamptz default now(),
  unique(user_id, source_type, source_id)
);

alter table public.xp_events enable row level security;

drop policy if exists xp_events_select_own on public.xp_events;
create policy xp_events_select_own
on public.xp_events
for select
using (auth.uid() = user_id);

drop policy if exists xp_events_insert_own on public.xp_events;
create policy xp_events_insert_own
on public.xp_events
for insert
with check (auth.uid() = user_id);

grant select, insert on public.xp_events to authenticated;

create index if not exists tasks_active_user_idx
on public.tasks(user_id, completed, completed_at desc)
where deleted_at is null;

create index if not exists todos_active_user_idx
on public.todos(user_id, completed, completed_at desc)
where deleted_at is null;
