-- Founder updates feed + founder-written startup insights.

-- 1. Startup insights (founder-written, shown as "Founder says", never verified)
alter table public.listings
  add column if not exists founded_on date,
  add column if not exists insights jsonb not null default '{}'::jsonb;

-- 2. Founder updates ("What's happening")
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists posts_listing_created_idx on public.posts (listing_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

-- Anyone can read updates on listings they can see (published, or their own draft).
create policy posts_select on public.posts for select using (public.can_view_listing(listing_id));
-- Only the listing's founder can post, as themselves.
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.owns_listing(listing_id));
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) and public.owns_listing(listing_id));

create policy post_likes_select on public.post_likes for select using (
  exists (select 1 from public.posts p where p.id = post_id and public.can_view_listing(p.listing_id))
);
create policy post_likes_insert on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id and public.can_view_listing(p.listing_id)));
create policy post_likes_delete on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
