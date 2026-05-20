-- Circle Momentum beta privacy controls and aggregate query indexes.
-- Private rows remain protected by existing RLS; the frontend only requests
-- public/circle-visible rows for this feature.

alter table public.profiles
  add column if not exists circle_momentum_visibility text not null default 'circle',
  add column if not exists circle_momentum_detail text not null default 'counts';

alter table public.profiles
  drop constraint if exists profiles_circle_momentum_visibility_check,
  add constraint profiles_circle_momentum_visibility_check
    check (circle_momentum_visibility in ('circle', 'public', 'hidden'));

alter table public.profiles
  drop constraint if exists profiles_circle_momentum_detail_check,
  add constraint profiles_circle_momentum_detail_check
    check (circle_momentum_detail in ('score', 'counts'));

create index if not exists idx_progress_logs_circle_momentum
  on public.progress_logs (user_id, visibility, created_at desc);

create index if not exists idx_posts_circle_momentum
  on public.posts (user_id, visibility, created_at desc);

create index if not exists idx_tasks_circle_momentum
  on public.tasks (user_id, visibility, updated_at desc);

create index if not exists idx_visions_circle_momentum
  on public.visions (user_id, visibility, updated_at desc);
