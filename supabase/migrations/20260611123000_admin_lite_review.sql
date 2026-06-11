-- Admin-lite: founder-reviewable feedback and reports.
-- profiles.is_admin is service-role managed; a trigger blocks self-promotion.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_visnova_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke execute on function public.is_visnova_admin() from public, anon;
grant execute on function public.is_visnova_admin() to authenticated;

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Client API calls always carry a JWT (anon/authenticated). Direct SQL and
  -- service-role contexts may change the flag; client tokens may not.
  if new.is_admin is distinct from old.is_admin
     and (select auth.jwt()) is not null
     and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_admin_flag() from public, anon, authenticated;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
  before update on public.profiles
  for each row execute function public.protect_profile_admin_flag();

drop policy if exists feedback_reports_admin_select on public.feedback_reports;
create policy feedback_reports_admin_select on public.feedback_reports
  for select to authenticated using (public.is_visnova_admin());

drop policy if exists feedback_reports_admin_update on public.feedback_reports;
create policy feedback_reports_admin_update on public.feedback_reports
  for update to authenticated using (public.is_visnova_admin());

drop policy if exists reports_admin_select on public.reports;
create policy reports_admin_select on public.reports
  for select to authenticated using (public.is_visnova_admin());

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports
  for update to authenticated using (public.is_visnova_admin());

-- Founder admin grant is applied manually with the service role, e.g.:
-- update public.profiles set is_admin = true where id = '<founder-user-id>';
