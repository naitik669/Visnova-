-- Reliable owner-checked post actions for archive, restore, and soft delete.

create or replace function public.visnova_archive_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set archived = true,
      archived_at = now(),
      updated_at = now()
  where id = target_post_id
    and user_id = auth.uid()
    and deleted_at is null;

  return found;
end;
$$;

create or replace function public.visnova_restore_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set archived = false,
      archived_at = null,
      updated_at = now()
  where id = target_post_id
    and user_id = auth.uid()
    and deleted_at is null;

  return found;
end;
$$;

create or replace function public.visnova_soft_delete_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set archived = true,
      archived_at = coalesce(archived_at, now()),
      deleted_at = coalesce(deleted_at, now()),
      updated_at = now()
  where id = target_post_id
    and user_id = auth.uid()
    and deleted_at is null;

  return found;
end;
$$;

grant execute on function public.visnova_archive_post(uuid) to authenticated;
grant execute on function public.visnova_restore_post(uuid) to authenticated;
grant execute on function public.visnova_soft_delete_post(uuid) to authenticated;
