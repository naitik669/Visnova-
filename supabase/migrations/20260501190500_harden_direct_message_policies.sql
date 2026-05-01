create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant on public.conversations
  for select using (public.is_conversation_participant(id));

drop policy if exists conversation_participants_select_own_conversations on public.conversation_participants;
create policy conversation_participants_select_own_conversations on public.conversation_participants
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
  for insert with check (
    user_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

grant execute on function public.is_conversation_participant(uuid) to authenticated;
