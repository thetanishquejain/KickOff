# Kickoff

Kickoff is a marketplace for buying and selling Indian SaaS, AI products and apps, with revenue verified from payment data.

- **Founders** upload a Razorpay payments CSV. Code calculates MRR, growth, refunds and customer concentration. Claude labels each payment and explains every risk flag, and the AI listing writer drafts the description.
- **Buyers** browse the marketplace and leaderboard, read an AI buyer summary (what's proven, what's missing, what to ask next) and question each listing in "Ask about this startup".
- **A number check** blocks any AI text whose numbers don't match the calculated metrics.

Built with Next.js 14, Supabase, Tailwind, shadcn/ui and Claude. It's a fork of [cult-directory-template](https://github.com/nolly-studio/cult-directory-template) (GPL-2.0, see `LICENSE.md`).

## Run locally

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → Legacy tab → service_role (server only) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `CLAUDE_MODEL`, `CLAUDE_FAST_MODEL` | Optional. Defaults: `claude-sonnet-4-5` and `claude-haiku-4-5` |
| `GA_SERVICE_ACCOUNT_EMAIL`, `GA_SERVICE_ACCOUNT_PRIVATE_KEY` | Optional. Google Cloud service account with the Analytics Data API enabled |

## Database

The migration is in `supabase/migrations/` and has already been applied to the KickOff project. The demo listings come from `supabase/seed/demo.sql`.

## Tests

```bash
pnpm test:metrics   # metrics, flags and number check against the planted test files
pnpm test:data      # regenerate the test CSVs in /test-data
```

Test files: `a_healthy.csv`, `b_concentration.csv` (one customer about 64% of revenue) and `c_inflated.csv` (last month about 3x the average). The same files are available as one-click samples on the upload screen.

## Deploy (Vercel)

1. Import this repo in Vercel.
2. Add the environment variables above.
3. Deploy. In Supabase → Authentication → URL Configuration, set the Site URL to your Vercel URL.
