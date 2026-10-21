# Template map (cult-directory-template → Kickoff)

| Template part | What it does | Decision |
|---|---|---|
| `db/supabase/client.ts`, `server.ts`, `middleware.ts`, `middleware.ts` (root) | Supabase browser/server clients and session refresh | **Keep** |
| `app/auth/callback/route.ts` | Exchanges auth code for a session | **Keep** |
| `app/login/*` | Email + password login, sign up, reset password | **Adapt**: add role (founder / buyer) and name to sign up, redirect by role |
| `components/ui/*` | shadcn/ui parts (button, card, dropdown, select, table, tabs, tooltip, dialog…) | **Keep**, restyled through `DESIGN.md` tokens |
| `lib/utils.ts` | `cn()` and string helpers | **Keep** |
| `app/submit/*` | "Submit your tool" form with logo upload and optional AI tags | **Adapt** into `/dashboard/new` ("List your startup") |
| `app/products/*`, `components/directory-*`, `components/hero.tsx` | Product grid, search, product page | **Replace** with `/marketplace`, `/leaderboard`, `/listing/[id]` |
| `components/nav.tsx` | Left sidebar with tags/labels and an admin menu | **Replace** with a Kickoff top nav |
| `components/cult/*` | Template animations and gradient headings | **Delete** (template branding) |
| `app/actions/*` | Product queries, filters, view counter | **Replace** with Kickoff queries |
| `hooks/*` | Upload and click-counter hooks | **Delete** (not used) |
| `fonts/haskoy.ttf`, `assets/*`, `public/ad-placeholder-*`, OG images | Template font, logos, ads | **Delete** |
| `app/layout.tsx` metadata | "Design x Engineering Directory" SEO text | **Replace** with Kickoff metadata |
| `app/globals.css`, `tailwind.config.ts` | Theme colours and custom button styles | **Replace** with `DESIGN.md` tokens |
| `supabase/migrations/*` (users, products, categories/labels/tags, view count, product-logos bucket) | Template tables | **Replace** with Kickoff migrations (profiles, listings, payments, metrics, flags, summaries, GA tables). The template migrations were never applied to the Kickoff database. |
| `package.json` seed/enrich scripts | Crawl and AI-enrich sample directory data | **Delete** (scripts folder isn't in the repo) |
| `@ai-sdk/openai` | OpenAI provider | **Unused** (Kickoff uses Claude only) |
| `LICENSE.md` | GPL-2.0 | **Keep** |
