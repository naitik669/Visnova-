-- Public beta schema lock repair.
-- Apply this to the live Supabase project when late beta migrations are missing.
-- It is intentionally idempotent and keeps existing data.

alter table if exists public.profiles
  add column if not exists default_currency text default 'INR',
  add column if not exists has_seen_landing boolean default false,
  add column if not exists onboarding_step text,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists user_type text,
  add column if not exists selected_theme text,
  add column if not exists first_vision_id uuid,
  add column if not exists first_task_id uuid,
  add column if not exists resource_recommendations_enabled boolean not null default true,
  add column if not exists resource_recommendations_use_vision_categories boolean not null default true,
  add column if not exists resource_recommendations_use_saved_resources boolean not null default true,
  add column if not exists resource_recommendations_use_money_goals boolean not null default true,
  add column if not exists resource_recommendations_use_store_activity boolean not null default true;

update public.profiles
set
  default_currency = coalesce(nullif(default_currency, ''), 'INR'),
  has_seen_landing = coalesce(has_seen_landing, false),
  onboarding_completed = coalesce(onboarding_completed, onboarded, false)
where true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_default_currency_check') then
    alter table public.profiles
      add constraint profiles_default_currency_check
      check (default_currency in ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED')) not valid;
  end if;
end $$;

alter table if exists public.tasks
  add column if not exists status text default 'planned',
  add column if not exists description text,
  add column if not exists priority text default 'medium',
  add column if not exists due_date timestamptz,
  add column if not exists progress_percent integer default 0,
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists checklist jsonb default '[]'::jsonb,
  add column if not exists sort_order integer default 0,
  add column if not exists visibility text default 'private',
  add column if not exists sub_tasks jsonb default '[]'::jsonb,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists deleted_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.tasks
set
  status = case
    when completed is true then 'done'
    when status is null then 'planned'
    else status
  end,
  priority = coalesce(priority, 'medium'),
  progress_percent = coalesce(progress_percent, 0),
  sort_order = coalesce(sort_order, 0),
  visibility = coalesce(visibility, 'private'),
  tags = coalesce(tags, '{}'::text[]),
  checklist = coalesce(checklist, '[]'::jsonb),
  sub_tasks = coalesce(sub_tasks, '[]'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb)
where true;

alter table if exists public.tasks drop constraint if exists tasks_status_check;
alter table if exists public.tasks
  add constraint tasks_status_check
  check (status in ('planned', 'today', 'in_progress', 'proof_needed', 'done'));

alter table if exists public.tasks drop constraint if exists tasks_priority_check;
alter table if exists public.tasks
  add constraint tasks_priority_check
  check (priority in ('low', 'medium', 'high'));

alter table if exists public.tasks drop constraint if exists tasks_progress_percent_check;
alter table if exists public.tasks
  add constraint tasks_progress_percent_check
  check (progress_percent between 0 and 100);

alter table if exists public.tasks drop constraint if exists tasks_visibility_check;
alter table if exists public.tasks
  add constraint tasks_visibility_check
  check (visibility in ('private', 'circle', 'public'));

create index if not exists idx_tasks_user_status on public.tasks(user_id, status, sort_order);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

alter table if exists public.notes
  add column if not exists note_icon text;

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  short_description text,
  image_url text,
  gallery_urls text[] not null default '{}',
  price numeric,
  compare_at_price numeric,
  currency text not null default 'INR',
  partner_name text,
  partner_url text,
  affiliate_url text not null,
  external_checkout_url text,
  digital_delivery_url text,
  supplier_id uuid,
  product_type text not null default 'physical_product',
  fulfillment_type text not null default 'affiliate_external',
  category text,
  tags text[] not null default '{}',
  vision_categories text[] not null default '{}',
  min_budget numeric,
  max_budget numeric,
  is_digital boolean not null default false,
  is_active boolean not null default true,
  safety_status text not null default 'approved',
  stock_status text not null default 'unknown',
  recommendation_priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_products
  add column if not exists short_description text,
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists compare_at_price numeric,
  add column if not exists fulfillment_type text not null default 'affiliate_external',
  add column if not exists partner_url text,
  add column if not exists external_checkout_url text,
  add column if not exists digital_delivery_url text,
  add column if not exists supplier_id uuid,
  add column if not exists stock_status text not null default 'unknown',
  add column if not exists recommendation_priority integer not null default 0;

update public.store_products
set
  fulfillment_type = coalesce(fulfillment_type, case when is_digital then 'digital_external' else 'affiliate_external' end),
  partner_url = coalesce(partner_url, affiliate_url),
  external_checkout_url = coalesce(external_checkout_url, affiliate_url),
  short_description = coalesce(short_description, left(description, 140)),
  stock_status = coalesce(stock_status, 'available')
where true;

create table if not exists public.user_saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  linked_vision_id uuid references public.visions(id) on delete set null,
  linked_money_goal_id uuid references public.finance_goals(id) on delete set null,
  status text not null default 'saved',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.store_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  product_id uuid not null references public.store_products(id) on delete cascade,
  event_type text not null,
  source_location text not null,
  linked_vision_id uuid references public.visions(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.store_products drop constraint if exists store_products_currency_check;
alter table public.store_products
  add constraint store_products_currency_check
  check (currency in ('INR','USD','EUR','GBP','JPY','AUD','CAD','SGD','AED'));

alter table public.store_products drop constraint if exists store_products_type_check;
alter table public.store_products
  add constraint store_products_type_check
  check (product_type in ('physical_product','digital_template','course','book','software','creator_tool','study_resource','startup_tool','productivity_kit'));

alter table public.store_products drop constraint if exists store_products_fulfillment_type_check;
alter table public.store_products
  add constraint store_products_fulfillment_type_check
  check (fulfillment_type in ('affiliate_external','digital_external','digital_internal_future','dropship_future','manual_partner_future'));

alter table public.store_products drop constraint if exists store_products_safety_check;
alter table public.store_products
  add constraint store_products_safety_check
  check (safety_status in ('approved','pending','rejected'));

alter table public.store_products drop constraint if exists store_products_stock_status_check;
alter table public.store_products
  add constraint store_products_stock_status_check
  check (stock_status in ('available','limited','out_of_stock','unknown'));

alter table public.user_saved_products drop constraint if exists user_saved_products_status_check;
alter table public.user_saved_products
  add constraint user_saved_products_status_check
  check (status in ('saved','planned','purchased_external','not_interested','hidden'));

alter table public.store_events drop constraint if exists store_events_type_check;
alter table public.store_events
  add constraint store_events_type_check
  check (event_type in ('impression','click','save','add_to_goal','not_interested','redirect','view_more','preference_changed'));

create index if not exists idx_store_products_active_safety on public.store_products(is_active, safety_status);
create index if not exists idx_store_products_tags on public.store_products using gin(tags);
create index if not exists idx_store_products_vision_categories on public.store_products using gin(vision_categories);
create index if not exists idx_store_products_fulfillment_type on public.store_products(fulfillment_type);
create index if not exists idx_store_products_recommendation_priority on public.store_products(recommendation_priority desc);
create index if not exists idx_user_saved_products_user_status on public.user_saved_products(user_id, status);
create index if not exists idx_store_events_user_created on public.store_events(user_id, created_at desc);

alter table public.store_products enable row level security;
alter table public.user_saved_products enable row level security;
alter table public.store_events enable row level security;

drop policy if exists store_products_read_approved on public.store_products;
create policy store_products_read_approved on public.store_products
  for select using (is_active = true and safety_status = 'approved');

drop policy if exists user_saved_products_select_own on public.user_saved_products;
create policy user_saved_products_select_own on public.user_saved_products
  for select using (auth.uid() = user_id);

drop policy if exists user_saved_products_insert_own on public.user_saved_products;
create policy user_saved_products_insert_own on public.user_saved_products
  for insert with check (auth.uid() = user_id);

drop policy if exists user_saved_products_update_own on public.user_saved_products;
create policy user_saved_products_update_own on public.user_saved_products
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_saved_products_delete_own on public.user_saved_products;
create policy user_saved_products_delete_own on public.user_saved_products
  for delete using (auth.uid() = user_id);

drop policy if exists store_events_insert_safe on public.store_events;
create policy store_events_insert_safe on public.store_events
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists store_events_select_own on public.store_events;
create policy store_events_select_own on public.store_events
  for select using (auth.uid() = user_id);

grant select on public.store_products to anon, authenticated;
grant select, insert, update, delete on public.user_saved_products to authenticated;
grant select, insert on public.store_events to authenticated;

insert into public.store_products
  (title, description, short_description, image_url, price, currency, partner_name, partner_url, affiliate_url, external_checkout_url, product_type, fulfillment_type, category, tags, vision_categories, is_digital, safety_status, stock_status)
values
  ('Weekly Focus Planner', 'A starter weekly planning template for turning visions into actions.', 'Plan the next week without overthinking it.', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=640&q=80', 0, 'INR', 'VisNova Starter', 'https://example.com/visnova/weekly-focus-planner', 'https://example.com/visnova/weekly-focus-planner', 'https://example.com/visnova/weekly-focus-planner', 'digital_template', 'digital_external', 'Productivity templates', array['planner','focus','productivity','starter'], array['personal-growth','study','creator','startup'], true, 'approved', 'available')
on conflict do nothing;
