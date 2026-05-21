-- Extend beta resource recommendations for affiliate, digital, and future fulfillment models.
-- This keeps beta checkout external while preparing safe product metadata.

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
  fulfillment_type = case
    when is_digital then 'digital_external'
    else 'affiliate_external'
  end,
  partner_url = coalesce(partner_url, affiliate_url),
  external_checkout_url = coalesce(external_checkout_url, affiliate_url),
  short_description = coalesce(short_description, left(description, 140)),
  stock_status = coalesce(stock_status, 'available')
where fulfillment_type is null
  or partner_url is null
  or external_checkout_url is null
  or short_description is null
  or stock_status = 'unknown';

alter table public.store_products
  drop constraint if exists store_products_type_check,
  add constraint store_products_type_check
    check (product_type in (
      'physical_product',
      'digital_template',
      'course',
      'book',
      'software',
      'creator_tool',
      'study_resource',
      'startup_tool',
      'productivity_kit'
    ));

alter table public.store_products
  drop constraint if exists store_products_fulfillment_type_check,
  add constraint store_products_fulfillment_type_check
    check (fulfillment_type in (
      'affiliate_external',
      'digital_external',
      'digital_internal_future',
      'dropship_future',
      'manual_partner_future'
    ));

alter table public.store_products
  drop constraint if exists store_products_stock_status_check,
  add constraint store_products_stock_status_check
    check (stock_status in ('available', 'limited', 'out_of_stock', 'unknown'));

alter table public.store_events
  drop constraint if exists store_events_type_check,
  add constraint store_events_type_check
    check (event_type in (
      'impression',
      'click',
      'save',
      'add_to_goal',
      'not_interested',
      'redirect',
      'view_more',
      'preference_changed'
    ));

create index if not exists idx_store_products_fulfillment_type
  on public.store_products (fulfillment_type);

create index if not exists idx_store_products_recommendation_priority
  on public.store_products (recommendation_priority desc);
