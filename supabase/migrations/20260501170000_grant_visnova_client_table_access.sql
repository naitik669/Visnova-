-- Allow Supabase client roles to reach tables before RLS policies are evaluated.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant select on public.profiles,
  public.visions,
  public.tasks,
  public.posts,
  public.post_media,
  public.post_tags,
  public.post_mentions,
  public.post_likes,
  public.comments,
  public.follows,
  public.user_circles,
  public.achievements,
  public.milestones
to anon;

grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;
