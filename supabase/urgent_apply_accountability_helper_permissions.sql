-- URGENT LIVE FIX: run this on the VisNova Supabase project if Weekly Proof
-- Sprint fails with "permission denied for function is_circle_connection".
-- The same SQL is also tracked as a normal migration:
-- supabase/migrations/20260526090000_repair_accountability_helper_permissions.sql

create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_circle_connection(target_user_id uuid)
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
        select 1
        from public.follows
        where follower_id = auth.uid()
          and following_id = target_user_id
      )
      or exists (
        select 1
        from public.follows
        where follower_id = target_user_id
          and following_id = auth.uid()
      )
      or exists (
        select 1
        from public.user_circles
        where user_id = auth.uid()
          and circle_user_id = target_user_id
      )
      or exists (
        select 1
        from public.user_circles
        where user_id = target_user_id
          and circle_user_id = auth.uid()
      )
    );
$$;

revoke all on function app_private.is_circle_connection(uuid) from public;
revoke all on function app_private.is_circle_connection(uuid) from anon;
grant execute on function app_private.is_circle_connection(uuid) to authenticated;

drop policy if exists weekly_proof_sprints_select_safe on public.weekly_proof_sprints;
create policy weekly_proof_sprints_select_safe
on public.weekly_proof_sprints
for select
using (
  auth.uid() = user_id
  or visibility = 'public'
  or (
    visibility = 'circle'
    and app_private.is_circle_connection(user_id)
    and exists (
      select 1
      from public.accountability_preferences ap
      where ap.user_id = weekly_proof_sprints.user_id
        and ap.show_in_circle_momentum = true
        and ap.momentum_visibility in ('circle', 'public')
    )
  )
);

drop policy if exists nudges_insert_circle_allowed on public.nudges;
create policy nudges_insert_circle_allowed
on public.nudges
for insert
with check (
  auth.uid() = from_user_id
  and app_private.is_circle_connection(to_user_id)
  and coalesce((
    select ap.allow_nudges
    from public.accountability_preferences ap
    where ap.user_id = to_user_id
  ), true) = true
);

drop function if exists public.is_circle_connection(uuid);
