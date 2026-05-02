alter table public.profiles
add column if not exists verified boolean default false,
add column if not exists verified_reason text,
add column if not exists verified_at timestamptz;

create or replace function public.prevent_user_verification_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.verified is distinct from old.verified or
    new.verified_reason is distinct from old.verified_reason or
    new.verified_at is distinct from old.verified_at
  ) then
    raise exception 'Verification fields can only be changed by an admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_user_verification_changes on public.profiles;
create trigger prevent_user_verification_changes
before update on public.profiles
for each row
execute function public.prevent_user_verification_changes();

alter table public.follows enable row level security;
drop policy if exists follows_select_public on public.follows;
drop policy if exists follows_select_authenticated on public.follows;
drop policy if exists follows_insert_own on public.follows;
drop policy if exists follows_delete_own on public.follows;
create policy follows_select_authenticated on public.follows
for select to authenticated
using (true);
create policy follows_insert_own on public.follows
for insert to authenticated
with check (auth.uid() = follower_id and follower_id <> following_id);
create policy follows_delete_own on public.follows
for delete to authenticated
using (auth.uid() = follower_id);

alter table public.user_circles enable row level security;
drop policy if exists user_circles_select_public on public.user_circles;
drop policy if exists user_circles_select_relevant on public.user_circles;
drop policy if exists user_circles_manage_own on public.user_circles;
create policy user_circles_select_relevant on public.user_circles
for select to authenticated
using (auth.uid() = user_id or auth.uid() = circle_user_id);
create policy user_circles_manage_own on public.user_circles
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and user_id <> circle_user_id);
