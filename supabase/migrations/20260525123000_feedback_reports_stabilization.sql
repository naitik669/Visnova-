-- Feedback / bug report stabilization for closed beta.
-- Keeps older columns for compatibility while adding the beta-ready contract.

create extension if not exists pgcrypto;

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null default 'feedback',
  title text,
  message text not null,
  page_url text,
  user_agent text,
  status text not null default 'new',
  priority text not null default 'normal',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.feedback_reports
  add column if not exists user_id uuid,
  add column if not exists type text not null default 'feedback',
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists page_url text,
  add column if not exists user_agent text,
  add column if not exists status text not null default 'new',
  add column if not exists priority text not null default 'normal',
  add column if not exists category text not null default 'feedback',
  add column if not exists severity text not null default 'normal',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.feedback_reports
set
  type = case
    when type in ('feedback', 'bug', 'feature_request', 'general') then type
    when coalesce(category, '') = 'bug' then 'bug'
    when coalesce(category, '') = 'feedback' then 'feedback'
    else 'general'
  end,
  priority = case
    when priority in ('low', 'normal', 'high', 'urgent') then priority
    when coalesce(severity, '') = 'critical' then 'urgent'
    when coalesce(severity, '') = 'high' then 'high'
    when coalesce(severity, '') = 'low' then 'low'
    else 'normal'
  end,
  status = case
    when status in ('new', 'reviewing', 'planned', 'fixed', 'closed') then status
    when status = 'resolved' then 'fixed'
    else 'new'
  end,
  metadata = coalesce(metadata, '{}'::jsonb);

alter table public.feedback_reports
  alter column type set not null,
  alter column message set not null,
  alter column status set not null,
  alter column priority set not null,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.feedback_reports drop constraint if exists feedback_reports_user_id_fkey;
alter table public.feedback_reports
  add constraint feedback_reports_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null not valid;

alter table public.feedback_reports drop constraint if exists feedback_reports_type_check;
alter table public.feedback_reports
  add constraint feedback_reports_type_check
  check (type in ('feedback', 'bug', 'feature_request', 'general')) not valid;

alter table public.feedback_reports drop constraint if exists feedback_reports_status_check;
alter table public.feedback_reports
  add constraint feedback_reports_status_check
  check (status in ('new', 'reviewing', 'planned', 'fixed', 'closed')) not valid;

alter table public.feedback_reports drop constraint if exists feedback_reports_priority_check;
alter table public.feedback_reports
  add constraint feedback_reports_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent')) not valid;

alter table public.feedback_reports drop constraint if exists feedback_reports_message_length_check;
alter table public.feedback_reports
  add constraint feedback_reports_message_length_check
  check (char_length(coalesce(message, '')) between 1 and 3000) not valid;

create index if not exists feedback_reports_user_created_idx
on public.feedback_reports(user_id, created_at desc);

create index if not exists feedback_reports_type_status_created_idx
on public.feedback_reports(type, status, created_at desc);

alter table public.feedback_reports enable row level security;

drop policy if exists feedback_reports_insert_anyone on public.feedback_reports;
drop policy if exists feedback_reports_insert_own on public.feedback_reports;
create policy feedback_reports_insert_own
on public.feedback_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists feedback_reports_select_own on public.feedback_reports;
create policy feedback_reports_select_own
on public.feedback_reports
for select
to authenticated
using (auth.uid() = user_id);

revoke all on public.feedback_reports from anon;
revoke update, delete on public.feedback_reports from authenticated;
grant select, insert on public.feedback_reports to authenticated;
