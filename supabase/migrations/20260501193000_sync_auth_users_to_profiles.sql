create or replace function public.sync_auth_user_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_name text := coalesce(
    nullif(metadata ->> 'display_name', ''),
    nullif(metadata ->> 'full_name', ''),
    nullif(metadata ->> 'name', ''),
    split_part(new.email, '@', 1),
    'Explorer'
  );
  profile_username text := lower(regexp_replace(coalesce(nullif(metadata ->> 'user_name', ''), split_part(new.email, '@', 1), 'user'), '[^a-zA-Z0-9_]+', '_', 'g'));
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    username,
    avatar_url,
    onboarded,
    onboarding_step,
    xp,
    level,
    streak
  )
  values (
    new.id,
    new.email,
    profile_name,
    profile_name,
    left(profile_username, 20),
    coalesce(nullif(metadata ->> 'avatar_url', ''), 'https://api.dicebear.com/7.x/shapes/svg?seed=' || new.id::text),
    false,
    0,
    0,
    1,
    0
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
  after insert on auth.users
  for each row execute function public.sync_auth_user_to_profile();

insert into public.profiles (
  id,
  email,
  full_name,
  display_name,
  username,
  avatar_url,
  onboarded,
  onboarding_step,
  xp,
  level,
  streak
)
select
  au.id,
  au.email,
  coalesce(nullif(au.raw_user_meta_data ->> 'display_name', ''), nullif(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1), 'Explorer'),
  coalesce(nullif(au.raw_user_meta_data ->> 'display_name', ''), nullif(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1), 'Explorer'),
  left(lower(regexp_replace(coalesce(nullif(au.raw_user_meta_data ->> 'user_name', ''), split_part(au.email, '@', 1), 'user'), '[^a-zA-Z0-9_]+', '_', 'g')), 20),
  coalesce(nullif(au.raw_user_meta_data ->> 'avatar_url', ''), 'https://api.dicebear.com/7.x/shapes/svg?seed=' || au.id::text),
  false,
  0,
  0,
  1,
  0
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
)
on conflict (id) do nothing;

grant execute on function public.sync_auth_user_to_profile() to authenticated;
