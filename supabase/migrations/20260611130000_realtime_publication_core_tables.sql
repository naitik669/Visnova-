-- The client already subscribes to postgres_changes on these tables, but only
-- `messages` was ever added to the supabase_realtime publication, so none of
-- those subscriptions fired (Vision Team members only saw changes after a
-- refresh). RLS still governs which rows each subscriber receives.

do $$
declare
  t text;
begin
  foreach t in array array[
    'visions',
    'tasks',
    'todos',
    'notes',
    'folders',
    'progress_logs',
    'finance_goals',
    'finance_transactions',
    'notifications',
    'vision_team_members',
    'vision_team_activity',
    'vision_team_comments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
