# Kickoff — project brief for Claude Code

Kickoff is a verified-revenue marketplace for buying and selling Indian SaaS, AI products and apps. Founders prove revenue from their Razorpay payment data; buyers browse verified listings and analyse them with AI. Built for an AI hackathon. **Deadline: Thursday 12:30 PM IST.** Keep scope to Version 1 below. Do not build Version 2 items.

## Starting point: forked template
This project is a fork of **nolly-studio/cult-directory-template** (free version, GPL-2.0).
- **Keep the `LICENSE.md` file.** This repo stays GPL-2.0 and public.
- **Do not upgrade Next.js** (template is on v14.2) or swap the package manager (pnpm). No time for migrations.
- **First, before writing code:** read the template's `app/`, `components/`, `lib/`, `db/supabase/` and `supabase/migrations/`, then write a short `TEMPLATE_MAP.md`: what each existing route, component and table does, and whether we **keep / adapt / delete** it for Kickoff.
- **Reuse, don't rebuild:** Supabase auth + middleware, the submit-product form (→ "List your startup"), product cards and filters (→ marketplace), the theme in `app/globals.css` (→ replace with `DESIGN.md` tokens), shadcn/ui components, Vercel AI SDK (→ buyer chat).
- **Delete or ignore:** the template's crawl/enrich/seed scripts, sample directory data, and any copy, logos or branding from the template.
- Add new tables as **new migration files** in `supabase/migrations/` (not one big `schema.sql`). Adapt the template's product table into `listings` if it fits; otherwise create `listings` and remove the old one.
- In Supabase: turn off email confirmation for the demo (template README notes the default SMTP limit is very low).

## Stack
- Next.js 14.2 from the template (App Router, TypeScript), Tailwind CSS, shadcn/ui, pnpm
- Supabase: auth (email login) + Postgres + storage
- Claude API, model `claude-sonnet-4-5` or newer, always asked for structured JSON. Template already has `ai` + `@ai-sdk/anthropic` (use for the buyer chat); `recharts` (charts) and `react-dropzone` (CSV upload) are also installed — use them.
- Code on GitHub, deployed on Vercel
- No n8n in v1

Env vars (never hardcode, never commit `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_PROJECT_ID=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GA_SERVICE_ACCOUNT_EMAIL=
GA_SERVICE_ACCOUNT_PRIVATE_KEY=   # from the service account JSON key; keep \n line breaks
```

## Version 1 — one two-sided journey (build only this)
1. **Founder side:** sign up as founder → create listing (name, category, short pitch, asking price in INR) → upload Razorpay payments CSV → see verified metrics, AI payment labels, risk flags with AI explanations → AI listing writer drafts description → founder edits and publishes.
2. **Marketplace:** public marketplace page + leaderboard. Filters by category. Show asking price and multiple (asking price ÷ annual revenue).
   - **Leaderboard sort dropdown:** MRR (default), Revenue (total in the selected period), Growth (MoM %), Traffic (unique visitors in period), Revenue per visitor (revenue ÷ visitors). Listings with no traffic data show "–" and sort last for the traffic sorts.
   - **Time range dropdown:** Last 30 days, Last 6 months, All time. All values computed by code from the `payments` table.
   - **Columns:** rank (top 3 get gold/silver/bronze rank badges), startup (logo or initial, name, one-line pitch cut with an ellipsis), founder (avatar or initial + name), the sorted metric, MoM growth (green ↑ / red ↓, "–" when there isn't a previous month to compare).
   - **Flag icon:** a small warning icon next to the number if the listing has any risk flag; hover/tap shows the flag title.
   - Sort and range are kept in the URL (`?sort=mrr&range=all`) so links can be shared.
3. **Buyer side:** sign up as buyer → open any listing → read AI buyer summary (what is proven, what is missing, what to ask next) → "Ask about this startup" chat that answers only from that listing's data.

## Rule: code does maths, AI does language
**Code (no AI):**
- MRR = sum of recurring payments in the latest full month (yearly plans ÷ 12)
- 6-month revenue, month-on-month growth, refund rate, customer concentration (top customer % of revenue)
- Flags: one customer > 30% of revenue; any month > 2× the previous 3-month average; refunds > 10% of revenue
- **Number check:** extract every number from AI text; each must match a calculated metric (allow rounding). If not, regenerate once; if it fails twice, show "summary under review" instead.

**AI (Claude, JSON output):**
1. Label each payment: `recurring | one_time | refund | unclear` (descriptions are messy: "Pro plan", "renewal", "inv-2231", Hinglish notes). Batch payments per call.
2. Explain each flag in plain English + one question a buyer should ask.
3. Draft listing description from verified metrics only.
4. Buyer summary: `{ proven: [], missing: [], ask_next: [] }`.
5. Buyer chat: system prompt contains only that listing's metrics, flags and description. If the answer isn't in the data, say so.

Founder can correct any payment label; metrics recalculate.

## Data model (Supabase)
- `profiles` (id = auth user id, role: `founder | buyer`, name)
- `listings` (id, founder_id, name, category, pitch, description, asking_price_inr, status: `draft | published`, created_at)
- `payments` (id, listing_id, payment_id, date, amount_inr, customer_id, description, status, ai_label, label_overridden)
- `metrics` (listing_id, mrr, revenue_6m, growth_pct, refund_pct, top_customer_pct, monthly jsonb, computed_at)
- `flags` (id, listing_id, type, detail jsonb, ai_explanation, buyer_question)
- `summaries` (listing_id, content jsonb, checked boolean)
Enable row-level security: founders edit only their own listings; published listings readable by everyone.

## Razorpay CSV format (use for upload + test data)
Columns: `id, created_at, amount, currency, status, method, email, contact, description, customer_id`
Amounts in paise in the export → divide by 100. Only `status = captured` counts as revenue; refunds as negative.

## Test data — create in `/test-data`
- `a_healthy.csv` — ~6 months, 40+ customers, steady growth, low refunds
- `b_concentration.csv` — one customer ≈ 60% of revenue
- `c_inflated.csv` — last month ≈ 3× the 3-month average
Pass marks: ≥ 90% labels correct, every planted problem flagged, zero invented numbers in AI text.

## Design
**Follow `DESIGN.md` for all colours, fonts, spacing, components and states.** Use only its tokens. Own look — **do not copy TrustMRR's layout, wording, colours or logo.** INR everywhere (₹, lakh formatting e.g. ₹4.2L). Mobile friendly. Brand name: **Kickoff**.

Pages: `/` (hero + leaderboard preview), `/marketplace`, `/leaderboard`, `/listing/[id]`, `/login`, `/signup` (pick role), `/dashboard` (founder: listings, upload, review labels, publish), `/listing/[id]/edit`.

## Not in v1 (Version 2 — show as "Coming soon" at most)
KYC (PAN, DigiLocker, GST, MCA, penny-drop), ITR upload, live Razorpay/Cashfree/PayU connection, n8n re-checks, NDA, data room, offers, escrow, deal documents, compare startups, MCP server, paid plans/commission, "Sign in with Google" for Analytics, Plausible and other analytics tools.

## Traffic from Google Analytics (build LAST, step 9 — only after steps 1–8 work)
Uses a Google Cloud **service account** (no OAuth, no Google app verification needed).
- Package: `@google-analytics/data` (GA4 Data API), server-side only.
- Founder flow (dashboard → listing → "Connect Google Analytics"):
  1. Show Kickoff's service account email with a copy button and the steps: GA4 → Admin → Property access management → add this email as **Viewer**.
  2. Founder pastes their **GA4 property ID** (numbers only, e.g. `412345678`).
  3. "Verify" button calls `POST /api/ga/connect` → runs a test `runReport`. Success → save; permission error → show "Kickoff can't read this property yet. Check the Viewer access step."
- Data pull `POST /api/ga/sync` (on connect, and a "Refresh" button): `runReport` with dimension `date`, metrics `activeUsers`, `sessions`, last 180 days → upsert into `traffic_daily`.
- Tables: `ga_connections` (listing_id, property_id, connected_at, last_synced_at, status) and `traffic_daily` (listing_id, date, active_users, sessions, is_demo boolean).
- Traffic (period) = sum of `active_users`. Revenue per visitor = revenue in period ÷ traffic, shown in ₹ with 2 decimals.
- Listing shows "Traffic verified from Google Analytics · last synced <date>". Not connected → "Traffic not connected".
- Demo seed: the 3 demo listings get sample `traffic_daily` rows with `is_demo = true`; the UI shows a "Demo data" tag wherever demo traffic is used. Never mix demo rows into real listings.
- Never expose the service account key to the browser. Never let a founder enter a property ID for a listing they don't own.

## Build order
0. Read the template, write `TEMPLATE_MAP.md`, get it running locally with `pnpm dev`, strip template branding and sample data
1. Apply `DESIGN.md` tokens to the theme; add founder/buyer role choice to the existing signup
2. DB tables + RLS as new files in `supabase/migrations/`, push with `supabase db push`
3. Test CSVs
4. CSV upload + parsing + metrics + flags (unit-test against the 3 CSVs)
5. Claude calls: labels, flag explanations, listing writer, buyer summary + number check
6. Marketplace, leaderboard, listing page
7. Buyer chat
8. Polish, seed 3 demo listings, deploy to Vercel
9. Google Analytics connection + Traffic and Revenue-per-visitor sorts (see section above)

## Demo (3 minutes)
Founder uploads `b_concentration.csv` → in under 30 seconds a verified profile appears flagging "62% of revenue is one customer" → AI drafts listing → publish → buyer logs in, reads summary, asks "Is revenue dependent on one client?" → chat answers from the data.

## Working rules
- After each build step, run `pnpm build` and fix errors before moving on.
- Commit after each step with a clear message.
- Ask before adding any paid service or new dependency that isn't obvious.
