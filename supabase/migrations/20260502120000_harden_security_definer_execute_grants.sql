revoke execute on function public.is_conversation_participant(uuid) from public, anon;
revoke execute on function public.start_direct_conversation(uuid) from public, anon;
revoke execute on function public.sync_auth_user_to_profile() from public, anon, authenticated;

grant execute on function public.is_conversation_participant(uuid) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
