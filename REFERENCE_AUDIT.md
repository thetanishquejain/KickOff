# Reference audit: TrustMRR → Kickoff

Reviewed the public pages of trustmrr.com on 21 Oct 2026. Kickoff follows its **product patterns**: marketplace-first layout, dense financial rows, verified-revenue focus. It uses its **own** brand, colours, logo, wording and code. No TrustMRR listings or data are reused.

| # | Page reviewed | Pattern observed | Kickoff translation | Status |
|---|---|---|---|---|
| 1 | `/` | Marketplace-first home: short hero, two buttons, listings straight away | Compact hero with search, stats strip from real listings, "Recently listed" and "Lowest asking multiple" rows | Done |
| 2 | `/` | Search-led discovery | Search in the hero, the header (desktop) and the mobile menu, plus the marketplace sidebar, all going to `/marketplace?q=` | Done |
| 3 | `/` | "Recently listed" strip | `ListingRows` sorted by `created_at` | Done |
| 4 | `/` | Curated "best deals" | "Lowest asking multiple" (named for what it ranks, not "best deal"). Only listings with a price and revenue qualify | Done |
| 5 | `/`, `/acquire` | Revenue-focused cards: MRR, growth, price, multiple, FOR SALE tag | `ListingCard` (2×2 metric grid, flag strip) and `ListingRow` | Done |
| 6 | `/` | Leaderboard table: #, startup, founder, MRR, MoM growth, "Show more" | `/leaderboard`: rank badges, sort (MRR, revenue, growth, traffic, ₹/visitor), range (30 days, 6 months, all time), category tabs, risk icon, Show more (25 per page) | Done |
| 7 | `/` (footer) | Category directory | Category chips with counts on home, sidebar on marketplace, tabs on leaderboard, footer links | Done |
| 8 | `/acquire` | Filtering and sorting for buyers | Search, category, MRR bands, price bands, max multiple, growth bands, no-flags and priced-only toggles, 7 sorts, filter chips, clear all, grid or list view, load more. Everything is kept in the URL | Done |
| 9 | `/startup/*` | Startup profile: revenue, price, multiple, growth, chart | `/listing/[id]`: header badges, section tabs (overview, financials, risks), metric tiles with tooltips, monthly chart, sticky deal panel | Done |
| 10 | `/startup/*` | Revenue history chart | Recharts bars (net revenue) and line (MRR), using only computed months | Done |
| 11 | `/` | Verification source shown ("checked hourly via Stripe…") | "Calculated from Razorpay data" badge, data window, "Traffic verified from Google Analytics · last synced", "Demo data" tags | Done (CSV upload, not live sync: v2) |
| 12 | Dashboard | Founder manages listings | `/dashboard`: progress, next step, preview. `/dashboard/[id]` tabs: overview, payments, metrics and risks, listing, preview, publish | Done |
| 13 | `/startup/*` | Buyer due diligence | AI buyer summary (proven, missing, ask next) with number check, risk flags with AI explanations, "Ask about this startup" chat | Done. Kickoff goes further than the reference here |
| 14 | All | Responsive nav, mobile menu | Header with active states, sheet menu below `lg`, phone card layout for the leaderboard | Done |
| 15 | `/founder/*` | Founder profile pages | `/founder/[id]`: published startups and combined MRR | Done |
| 16 | `/about`, `/faq`, `/why-sell` | Explainer and FAQ pages | `/how-it-works`, `/faq` (keyboard accordion) | Done |
| 18 | `/startup/*` header | Share and Visit buttons; stat cards (all-time revenue with rank, MRR with subscriptions, founder, founded) | Share (native share or copy link), Visit (founder's website); cards: all-time revenue + "Ranked #N on Kickoff by MRR", MRR + paying customers, founder + startup count, founded or payment history; "Revenue calculated from a Razorpay export · last updated" line | Done |
| 19 | `/startup/*` chart | Revenue/MRR selector, period dropdown, dashed previous period, "% vs prev period" | `RevenueExplorer`: Revenue (daily) or MRR, last 30/90 days, 6 months, all time, dashed previous window, % change. Built from computed daily and monthly metrics only | Done |
| 20 | `/startup/*` "Startup insights" | Value proposition, problem, audience, market, pricing, tech stack, additional info | Founder-written insights (value proposition, problem, audience, B2B/B2C, pricing, tech stack, channels, extra, founded), edited on the listing editor and labelled "Written by the founder · not verified" | Done |
| 21 | `/` "What's happening?" | Founder posts feed with likes and share | `posts` + `post_likes` tables (RLS: only a listing's founder can post), composer on the founder's listing page, feed on home and `/feed`, likes, copy link, delete own | Done |
| 22 | Theme toggle | Light/dark | Kickoff dark token set, toggle in the header, saved per browser, charts read tokens at runtime | Done |
| 23 | Side rails | Paid sponsor ads ("Advertise, 1/20 spots left") | Not built: paid placements are v2 (paid plans) and showing ads for real third-party products would be fabricated endorsements | Not built |
| 24 | `/startup/*` | Domain rating, website screenshot, X follower counts | Not built: needs third-party data sources we have no access to; would otherwise be invented | Not built |
| 17 | Footer | Feed, founder chats, co-founder search, compare, templates, stats games, newsletter, Telegram alerts | Out of scope for v1. Compare and deal documents are listed as v2 in CLAUDE.md | Not built |

## API (`/docs/api/list-startups`)
TrustMRR documents a public REST API (list startups, get startup) that needs an API key from their dashboard. Kickoff doesn't use it. We have no key or permission, and copying their listings would be fabricating Kickoff data. A Kickoff API or MCP server is v2.
