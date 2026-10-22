-- Marketplace filters: explicit sale availability, business model, publish timestamp,
-- and a read-only view the marketplace filters, sorts and paginates on in the database.

-- 1. Listing fields -----------------------------------------------------------------
alter table public.listings
  add column if not exists is_for_sale boolean not null default false,
  add column if not exists business_model text check (business_model in ('b2b', 'b2c', 'b2b2c')),
  add column if not exists published_at timestamptz;

-- One-time backfill for listings that existed before the explicit flag:
-- the founder had set an asking price, which was how "for sale" was shown until now.
-- From here on, is_for_sale is only changed by the founder's own toggle.
update public.listings set is_for_sale = true where asking_price_inr is not null and is_for_sale = false;
update public.listings set published_at = coalesce(published_at, created_at) where status = 'published';
update public.listings
  set business_model = case insights->>'customer_type' when 'B2B' then 'b2b' when 'B2C' then 'b2c' when 'B2B and B2C' then 'b2b2c' end
  where business_model is null and insights ? 'customer_type';

-- Keep published_at in step with status.
create or replace function public.set_published_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published' or new.published_at is null) then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
  end if;
  return new;
end $$;

drop trigger if exists listings_published_at on public.listings;
create trigger listings_published_at before insert or update of status on public.listings
for each row execute function public.set_published_at();

-- 2. Marketplace view -----------------------------------------------------------------
-- security_invoker: the caller's row-level security applies, so only published listings
-- (or the caller's own drafts, which the query then excludes) are visible. No payment rows
-- or customer data are read here, only the aggregated metrics row.
create or replace view public.marketplace_listings with (security_invoker = true) as
with base as (
  select
    l.id, l.founder_id, l.name, l.category, l.pitch, l.website, l.asking_price_inr,
    l.status, l.is_demo, l.is_for_sale, l.business_model, l.published_at, l.created_at, l.updated_at,
    m.mrr, m.arr, m.growth_pct, m.revenue_6m, m.revenue_total, m.refund_pct, m.top_customer_pct,
    m.customers_6m, m.latest_month, m.computed_at, m.data,
    case when m.latest_month ~ '^\d{4}-\d{2}$'
      then ((m.latest_month || '-01')::date + interval '1 month' - interval '1 day')::date end as period_end
  from public.listings l
  left join public.metrics m on m.listing_id = l.id
  where l.status = 'published'
)
select
  b.id, b.founder_id, b.name, b.category, b.pitch, b.website, b.asking_price_inr,
  b.status, b.is_demo, b.is_for_sale, b.business_model, b.published_at, b.created_at, b.updated_at,
  b.mrr, b.arr, b.growth_pct, b.refund_pct, b.top_customer_pct, b.customers_6m, b.latest_month,
  b.computed_at, b.period_end,
  -- Revenue per reporting range (net of refunds, full months only).
  r.revenue_30d,
  b.revenue_6m,
  b.revenue_total as revenue_all,
  -- Multiple is unavailable (null) when ARR is zero or missing, never zero.
  case when b.arr > 0 and b.asking_price_inr is not null then round(b.asking_price_inr / b.arr, 2) end as arr_multiple,
  coalesce(f.flag_count, 0) as flag_count,
  t.visitors_30d, t.visitors_6m, t.visitors_all,
  case when t.visitors_30d > 0 then round(r.revenue_30d / t.visitors_30d, 2) end as rpv_30d,
  case when t.visitors_6m > 0 then round(b.revenue_6m / t.visitors_6m, 2) end as rpv_6m,
  case when t.visitors_all > 0 then round(b.revenue_total / t.visitors_all, 2) end as rpv_all
from base b
left join lateral (
  select case when b.period_end is null then null else coalesce(sum((d->>1)::numeric), 0) end as revenue_30d
  from jsonb_array_elements(coalesce(b.data->'daily', '[]'::jsonb)) d
  where b.period_end is not null and (d->>0)::date between b.period_end - 29 and b.period_end
) r on true
left join lateral (
  select count(*)::int as flag_count from public.flags fl where fl.listing_id = b.id
) f on true
left join lateral (
  select
    sum(td.active_users) filter (where td.date between b.period_end - 29 and b.period_end) as visitors_30d,
    sum(td.active_users) filter (where td.date between (date_trunc('month', b.period_end) - interval '5 months')::date and b.period_end) as visitors_6m,
    sum(td.active_users) filter (where td.date <= b.period_end) as visitors_all
  from public.traffic_daily td
  where td.listing_id = b.id and b.period_end is not null
) t on true;

grant select on public.marketplace_listings to anon, authenticated;

-- Category filter + sort paths: listings are filtered by status first (existing index),
-- the joins use metrics' primary key and the existing flags/traffic listing indexes.
-- No further indexes until the dataset needs them.
