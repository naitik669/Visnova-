alter table public.profiles
add column if not exists has_seen_landing boolean default false;

update public.profiles
set has_seen_landing = false
where has_seen_landing is null;
