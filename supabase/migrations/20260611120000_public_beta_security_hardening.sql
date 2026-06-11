-- Public beta security hardening (audit 2026-06-11)
-- 1) SECURITY DEFINER RPCs must not be callable by anon.
-- 2) Trigger functions must not be callable as RPC at all.
-- 3) Notes become strictly owner-only (product promise: notes are private).
-- 4) Legacy email-based ownership clause removed from visions/tasks policies
--    (verified 2026-06-11: zero rows depend on the email match).
-- 5) Public buckets keep object URL access but stop allowing full listing.

-- 1. SECURITY DEFINER RPCs: EXECUTE was granted via PUBLIC, which is what lets
--    anon call them. Revoke PUBLIC; signed-in access stays via the explicit
--    authenticated grants (added below where missing).
revoke execute on function public.create_vision_team_if_missing(uuid, uuid) from public, anon;
revoke execute on function public.create_vision_team_invite(uuid, text, timestamp with time zone, integer) from public, anon;
revoke execute on function public.join_vision_team(text) from public, anon;
revoke execute on function public.remove_vision_team_member(uuid, uuid) from public, anon;
revoke execute on function public.revoke_vision_team_invite(uuid) from public, anon;
revoke execute on function public.update_vision_team_member_role(uuid, uuid, text) from public, anon;
revoke execute on function public.validate_vision_team_invite(text) from public, anon;

grant execute on function public.create_vision_team_if_missing(uuid, uuid) to authenticated;
grant execute on function public.create_vision_team_invite(uuid, text, timestamp with time zone, integer) to authenticated;
grant execute on function public.join_vision_team(text) to authenticated;
grant execute on function public.remove_vision_team_member(uuid, uuid) to authenticated;
grant execute on function public.revoke_vision_team_invite(uuid) to authenticated;
grant execute on function public.update_vision_team_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.validate_vision_team_invite(text) to authenticated;

-- Client-facing RPCs that should stay authenticated-only (drop the PUBLIC grant)
revoke execute on function public.is_conversation_participant(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.start_direct_conversation(uuid) from public, anon;
revoke execute on function public.visnova_archive_post(uuid) from public, anon;
revoke execute on function public.visnova_restore_post(uuid) from public, anon;
revoke execute on function public.visnova_soft_delete_comment(uuid) from public, anon;
revoke execute on function public.visnova_soft_delete_post(uuid) from public, anon;
revoke execute on function public.visnova_toggle_comment_pin(uuid, boolean) from public, anon;

grant execute on function public.is_conversation_participant(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
grant execute on function public.visnova_archive_post(uuid) to authenticated;
grant execute on function public.visnova_restore_post(uuid) to authenticated;
grant execute on function public.visnova_soft_delete_comment(uuid) to authenticated;
grant execute on function public.visnova_soft_delete_post(uuid) to authenticated;
grant execute on function public.visnova_toggle_comment_pin(uuid, boolean) to authenticated;

-- 2. Trigger functions are not part of the client API at all
revoke execute on function public.prevent_user_verification_changes() from public, anon, authenticated;
revoke execute on function public.protect_profile_verification_fields() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = '';

-- 3. Notes: strictly owner-only reads
drop policy if exists notes_select_public on public.notes;
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
  for select using (auth.uid() = user_id);

-- 4. Remove legacy email-ownership clause
drop policy if exists visions_select on public.visions;
create policy visions_select on public.visions
  for select using ((auth.uid() = user_id) or (visibility = 'public'::text));

drop policy if exists visions_update_own on public.visions;
create policy visions_update_own on public.visions
  for update using (auth.uid() = user_id);

drop policy if exists visions_delete_own on public.visions;
create policy visions_delete_own on public.visions
  for delete using (auth.uid() = user_id);

drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own on public.tasks
  for select using (
    (auth.uid() = user_id)
    or exists (
      select 1 from public.visions v
      where v.id = tasks.vision_id and auth.uid() = v.user_id
    )
  );

-- 5. Public buckets: object URLs keep working without broad select policies
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists post_images_public_read on storage.objects;
drop policy if exists post_images_select_public on storage.objects;
drop policy if exists vision_board_images_public_read on storage.objects;
