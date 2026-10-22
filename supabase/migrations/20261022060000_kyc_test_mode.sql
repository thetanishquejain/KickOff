-- KYC in test mode for founders and buyers.
-- The full PAN is never stored: only a salted SHA-256 hash and the last four characters.
-- Real verification (NSDL/Protean PAN check, DigiLocker, GST portal) is v2 and needs a paid provider.

create table if not exists public.kyc_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('founder', 'buyer')),
  legal_name text not null check (char_length(legal_name) between 3 and 100),
  pan_last4 text not null check (pan_last4 ~ '^[A-Z0-9]{4}$'),
  pan_hash text not null,
  gstin_last4 text,
  status text not null default 'verified_test' check (status in ('verified_test', 'rejected')),
  mode text not null default 'test' check (mode = 'test'),
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kyc_verifications enable row level security;

-- Each person reads and writes only their own row. mode is pinned to 'test', so nothing written
-- through the API can claim a real (non-test) verification.
create policy kyc_select_own on public.kyc_verifications for select to authenticated using (user_id = (select auth.uid()));
create policy kyc_insert_own on public.kyc_verifications for insert to authenticated with check (user_id = (select auth.uid()) and mode = 'test');
create policy kyc_update_own on public.kyc_verifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and mode = 'test');

-- Public badge lookup: returns only the status word, never PAN or name details.
create or replace function public.kyc_status(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select status from public.kyc_verifications where user_id = uid
$$;
revoke execute on function public.kyc_status(uuid) from public;
grant execute on function public.kyc_status(uuid) to anon, authenticated;
