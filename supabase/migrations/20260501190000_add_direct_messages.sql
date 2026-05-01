create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

drop policy if exists conversation_participants_select_own_conversations on public.conversation_participants;
create policy conversation_participants_select_own_conversations on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants mine
      where mine.conversation_id = conversation_id and mine.user_id = auth.uid()
    )
  );

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create or replace function public.start_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if other_user_id = current_user_id then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  select cp1.conversation_id into existing_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  where cp1.user_id = current_user_id
    and cp2.user_id = other_user_id
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations default values returning id into new_id;
  insert into public.conversation_participants (conversation_id, user_id)
  values (new_id, current_user_id), (new_id, other_user_id)
  on conflict do nothing;

  return new_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.conversations, public.conversation_participants, public.messages to authenticated;
grant insert on public.messages to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
