alter table public.notes
  add column if not exists updated_at timestamptz default now();

alter table public.messages
  add column if not exists updated_at timestamptz default now();

update public.notes
set created_at = now()
where created_at is null;

update public.notes
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.posts
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.tasks
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.visions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.profiles
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.comments
set created_at = now()
where created_at is null;

update public.comments
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.growth_resources
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.finance_transactions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.finance_goals
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.finance_subscriptions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.nova_capsules
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.messages
set created_at = now()
where created_at is null;

update public.messages
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_visions_updated_at on public.visions;
create trigger set_visions_updated_at
before update on public.visions
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_growth_resources_updated_at on public.growth_resources;
create trigger set_growth_resources_updated_at
before update on public.growth_resources
for each row execute function public.set_updated_at();

drop trigger if exists set_finance_transactions_updated_at on public.finance_transactions;
create trigger set_finance_transactions_updated_at
before update on public.finance_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_finance_goals_updated_at on public.finance_goals;
create trigger set_finance_goals_updated_at
before update on public.finance_goals
for each row execute function public.set_updated_at();

drop trigger if exists set_finance_subscriptions_updated_at on public.finance_subscriptions;
create trigger set_finance_subscriptions_updated_at
before update on public.finance_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_nova_capsules_updated_at on public.nova_capsules;
create trigger set_nova_capsules_updated_at
before update on public.nova_capsules
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();
