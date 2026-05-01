-- Tighten advisor-flagged security from the initial backend foundation.

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

drop function if exists public.handle_new_user() cascade;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;
revoke all on function app_private.set_updated_at() from public, anon, authenticated;

drop policy if exists post_images_public_read on storage.objects;
