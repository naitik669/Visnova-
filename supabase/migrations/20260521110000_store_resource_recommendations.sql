-- Beta-safe Resources for your Vision recommendation layer.
-- Affiliate-first only: no checkout, orders, inventory, or private-content signals.

alter table public.profiles
  add column if not exists resource_recommendations_enabled boolean not null default true,
  add column if not exists resource_recommendations_use_vision_categories boolean not null default true,
  add column if not exists resource_recommendations_use_saved_resources boolean not null default true,
  add column if not exists resource_recommendations_use_money_goals boolean not null default true,
  add column if not exists resource_recommendations_use_store_activity boolean not null default true;

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  price numeric,
  currency text not null default 'INR',
  partner_name text,
  affiliate_url text not null,
  product_type text not null default 'physical_product',
  category text,
  tags text[] not null default '{}',
  vision_categories text[] not null default '{}',
  min_budget numeric,
  max_budget numeric,
  is_digital boolean not null default false,
  is_active boolean not null default true,
  safety_status text not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.store_products
  drop constraint if exists store_products_currency_check,
  add constraint store_products_currency_check
    check (currency in ('INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'));

alter table public.store_products
  drop constraint if exists store_products_type_check,
  add constraint store_products_type_check
    check (product_type in ('physical_product', 'digital_template', 'course', 'book', 'software', 'creator_tool', 'study_resource', 'startup_tool'));

alter table public.store_products
  drop constraint if exists store_products_safety_check,
  add constraint store_products_safety_check
    check (safety_status in ('approved', 'pending', 'rejected'));

alter table public.user_saved_products
  drop constraint if exists user_saved_products_status_check,
  add constraint user_saved_products_status_check
    check (status in ('saved', 'planned', 'purchased_external', 'not_interested', 'hidden'));

alter table public.store_events
  drop constraint if exists store_events_type_check,
  add constraint store_events_type_check
    check (event_type in ('impression', 'click', 'save', 'add_to_goal', 'not_interested', 'redirect'));

create index if not exists idx_store_products_active_safety
  on public.store_products (is_active, safety_status);

create index if not exists idx_store_products_tags
  on public.store_products using gin (tags);

create index if not exists idx_store_products_vision_categories
  on public.store_products using gin (vision_categories);

create index if not exists idx_user_saved_products_user_status
  on public.user_saved_products (user_id, status);

create index if not exists idx_store_events_user_created
  on public.store_events (user_id, created_at desc);

alter table public.store_products enable row level security;
alter table public.user_saved_products enable row level security;
alter table public.store_events enable row level security;

drop policy if exists store_products_read_approved on public.store_products;
create policy store_products_read_approved on public.store_products
  for select
  using (is_active = true and safety_status = 'approved');

drop policy if exists user_saved_products_select_own on public.user_saved_products;
create policy user_saved_products_select_own on public.user_saved_products
  for select
  using (auth.uid() = user_id);

drop policy if exists user_saved_products_insert_own on public.user_saved_products;
create policy user_saved_products_insert_own on public.user_saved_products
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_saved_products_update_own on public.user_saved_products;
create policy user_saved_products_update_own on public.user_saved_products
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_saved_products_delete_own on public.user_saved_products;
create policy user_saved_products_delete_own on public.user_saved_products
  for delete
  using (auth.uid() = user_id);

drop policy if exists store_events_insert_safe on public.store_events;
create policy store_events_insert_safe on public.store_events
  for insert
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists store_events_select_own on public.store_events;
create policy store_events_select_own on public.store_events
  for select
  using (auth.uid() = user_id);

grant select on public.store_products to anon, authenticated;
grant select, insert, update, delete on public.user_saved_products to authenticated;
grant select, insert on public.store_events to authenticated;

insert into public.store_products
  (title, description, image_url, price, currency, partner_name, affiliate_url, product_type, category, tags, vision_categories, is_digital, safety_status)
values
  ('Budget Lavalier Mic', 'A simple starter mic for creator updates, course videos, and proof clips.', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=640&q=80', 899, 'INR', 'Partner Marketplace', 'https://example.com/visnova/budget-lavalier-mic', 'creator_tool', 'Creator setup', array['creator','youtube','video','mic','audio','setup'], array['creator','resources'], false, 'approved'),
  ('Thumbnail Template Pack', 'Editable thumbnail layouts for content planning and launch updates.', 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=640&q=80', 299, 'INR', 'Template Partner', 'https://example.com/visnova/thumbnail-template-pack', 'digital_template', 'Creator templates', array['creator','thumbnail','template','content','design'], array['creator'], true, 'approved'),
  ('Study Sprint Planner', 'A lightweight planning kit for weekly study blocks, exams, and revision goals.', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=640&q=80', 199, 'INR', 'Template Partner', 'https://example.com/visnova/study-sprint-planner', 'digital_template', 'Study resources', array['study','planner','exam','focus','notes'], array['study'], true, 'approved'),
  ('Startup Pitch Deck Kit', 'Structured slides for early product ideas, beta plans, and founder updates.', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=640&q=80', 799, 'INR', 'Template Partner', 'https://example.com/visnova/pitch-deck-kit', 'startup_tool', 'Startup templates', array['startup','pitch','launch','founder','deck','business'], array['startup'], true, 'approved'),
  ('Developer UI Kit', 'Reusable UI screens and components for faster product prototyping.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=640&q=80', 19, 'USD', 'Design Partner', 'https://example.com/visnova/developer-ui-kit', 'software', 'Coding tools', array['coding','developer','ui','template','app','web'], array['coding','startup'], true, 'approved'),
  ('Creator Lighting Starter Kit', 'A safe entry-level lighting setup for desk videos and creator proof logs.', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80', 1499, 'INR', 'Partner Marketplace', 'https://example.com/visnova/creator-lighting-kit', 'creator_tool', 'Creator setup', array['creator','video','lighting','youtube','gear','setup'], array['creator','resources'], false, 'approved')
on conflict do nothing;
