-- Kickoff schema: profiles, listings, payments, metrics, flags, summaries, Google Analytics traffic.

-- Profiles (one per auth user, with a founder/buyer role)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'buyer' check (role in ('founder', 'buyer')),
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'founder' then 'founder' else 'buyer' end,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text not null,
  pitch text not null,
  description text,
  website text,
  asking_price_inr numeric(14, 2),
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_demo boolean not null default false,
  data_source text, -- e.g. 'razorpay_csv'
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_status_idx on public.listings (status);
create index listings_founder_idx on public.listings (founder_id);

-- Payments (from the Razorpay CSV). Customer is a hashed key, never an email or phone.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  payment_id text not null,
  paid_at timestamptz not null,
  amount_inr numeric(14, 2) not null,
  status text not null,
  method text,
  customer_key text,
  description text not null default '',
  label text check (label in ('recurring', 'one_time', 'refund', 'unclear')),
  billing_interval text check (billing_interval in ('monthly', 'yearly')),
  label_source text check (label_source in ('ai', 'rules', 'founder')),
  label_reason text,
  unique (listing_id, payment_id)
);
create index payments_listing_idx on public.payments (listing_id);

-- Metrics (calculated by code)
create table public.metrics (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  mrr numeric(14, 2) not null default 0,
  arr numeric(14, 2) not null default 0,
  growth_pct numeric(8, 1),
  revenue_6m numeric(14, 2) not null default 0,
  revenue_total numeric(14, 2) not null default 0,
  refund_pct numeric(6, 1) not null default 0,
  top_customer_pct numeric(6, 1) not null default 0,
  customers_6m integer not null default 0,
  latest_month text,
  data jsonb not null default '{}'::jsonb, -- full Metrics object incl. monthly rows
  computed_at timestamptz not null default now()
);

-- Risk flags (found by code, explained by AI)
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  type text not null,
  title text not null,
  detail jsonb not null default '{}'::jsonb,
  ai_explanation text,
  buyer_question text,
  created_at timestamptz not null default now()
);
create index flags_listing_idx on public.flags (listing_id);

-- AI buyer summary (written server-side after the number check)
create table public.summaries (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  content jsonb,
  checked boolean not null default false,
  status text not null default 'ok' check (status in ('ok', 'under_review')),
  metrics_computed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Google Analytics (service account) connection and daily traffic
create table public.ga_connections (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  property_id text not null,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

create table public.traffic_daily (
  listing_id uuid not null references public.listings (id) on delete cascade,
  date date not null,
  active_users integer not null default 0,
  sessions integer not null default 0,
  is_demo boolean not null default false,
  primary key (listing_id, date)
);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger listings_touch before update on public.listings
for each row execute function public.touch_updated_at();

-- Helper: is the current user the owner of a listing?
create or replace function public.owns_listing(lid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings l where l.id = lid and l.founder_id = (select auth.uid()));
$$;

-- Helper: can the current user see a listing (published, or their own)?
create or replace function public.can_view_listing(lid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = lid and (l.status = 'published' or l.founder_id = (select auth.uid()))
  );
$$;

-- Row-level security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.payments enable row level security;
alter table public.metrics enable row level security;
alter table public.flags enable row level security;
alter table public.summaries enable row level security;
alter table public.ga_connections enable row level security;
alter table public.traffic_daily enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Published or own listings are visible" on public.listings for select
  using (status = 'published' or founder_id = (select auth.uid()));
create policy "Founders create own listings" on public.listings for insert
  with check (
    founder_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'founder')
  );
create policy "Founders update own listings" on public.listings for update
  using (founder_id = (select auth.uid())) with check (founder_id = (select auth.uid()));
create policy "Founders delete own listings" on public.listings for delete
  using (founder_id = (select auth.uid()));

-- Raw payments are visible only to the listing's founder.
create policy "Owner reads payments" on public.payments for select using (public.owns_listing(listing_id));
create policy "Owner inserts payments" on public.payments for insert with check (public.owns_listing(listing_id));
create policy "Owner updates payments" on public.payments for update
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));
create policy "Owner deletes payments" on public.payments for delete using (public.owns_listing(listing_id));

create policy "Visible metrics" on public.metrics for select using (public.can_view_listing(listing_id));
create policy "Owner writes metrics" on public.metrics for insert with check (public.owns_listing(listing_id));
create policy "Owner updates metrics" on public.metrics for update
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));

create policy "Visible flags" on public.flags for select using (public.can_view_listing(listing_id));
create policy "Owner writes flags" on public.flags for insert with check (public.owns_listing(listing_id));
create policy "Owner updates flags" on public.flags for update
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));
create policy "Owner deletes flags" on public.flags for delete using (public.owns_listing(listing_id));

-- Summaries and traffic are written by the server (service role) only.
create policy "Visible summaries" on public.summaries for select using (public.can_view_listing(listing_id));
create policy "Visible traffic" on public.traffic_daily for select using (public.can_view_listing(listing_id));
create policy "Owner reads GA connection" on public.ga_connections for select using (public.owns_listing(listing_id));

revoke execute on function public.owns_listing(uuid) from public;
revoke execute on function public.can_view_listing(uuid) from public;
grant execute on function public.owns_listing(uuid) to anon, authenticated;
grant execute on function public.can_view_listing(uuid) to anon, authenticated;
