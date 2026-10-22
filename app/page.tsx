import Link from "next/link"
import { ArrowRight, BadgeCheck, Search } from "lucide-react"

import { getPublishedListings, type ListingFull } from "@/lib/data"
import { inr, inrShort, monthLabel } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { DemoTag, Growth, InitialAvatar } from "@/components/kit"
import { LeaderboardTable } from "@/components/leaderboard"
import { SideRails } from "@/components/side-rails"

export const dynamic = "force-dynamic"

const STEPS: [string, string][] = [
  ["Founders share their Razorpay data", "Upload the payments export or connect Razorpay. Nothing is typed in by hand."],
  ["Kickoff's code does the maths", "MRR, growth, refunds and customer concentration, with risk flags explained in plain English."],
  ["Buyers browse and ask", "Compare startups by verified numbers and ask each listing questions answered from its own data."],
]

export default async function Home() {
  const listings = await getPublishedListings()
  const verified = listings.filter((l) => l.metrics)
  const totalMrr = verified.reduce((s, l) => s + (l.metrics?.mrr ?? 0), 0)
  const top = [...verified].sort((a, b) => (b.metrics?.mrr ?? 0) - (a.metrics?.mrr ?? 0))[0]

  return (
    <div className="flex flex-col gap-20 pb-10 md:gap-28">
      <SideRails listings={listings} />

      {/* Hero: one message, one action, and one real verified profile as proof */}
      <section className="grid grid-cols-1 items-center gap-10 pt-12 md:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h1 className="max-w-[14ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[60px]">
            The database of verified startup revenues
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-muted md:text-lg">
            Browse SaaS, mobile apps, and digital businesses for acquisition on Kickoff.{" "}
            <Link href="/marketplace" className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-brand hover:decoration-brand">
              Explore the marketplace
            </Link>
          </p>

          <form action="/marketplace" role="search" className="mt-8 flex max-w-md gap-2">
            <label htmlFor="hero-q" className="sr-only">
              Search startups
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="hero-q"
                name="q"
                placeholder="Search startups"
                className="h-12 w-full rounded-lg border border-line bg-surface pl-10 pr-3 text-[15px] shadow-card placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <Button type="submit" className="h-12 px-5">
              Search
            </Button>
          </form>

          <p className="mt-5 text-sm text-ink-muted">
            {verified.length > 0 && (
              <>
                {verified.length} startups verified, with <span className="num font-medium text-ink">{inrShort(totalMrr)}</span> in combined monthly revenue.{" "}
              </>
            )}
            <Link href="/signup?role=founder" className="whitespace-nowrap font-medium text-ink underline-offset-4 hover:text-brand hover:underline">
              List yours free
            </Link>
          </p>
        </div>

        {top && <ProofCard l={top} />}
      </section>

      {/* One list: the best proof that the numbers are real */}
      <section aria-labelledby="lb-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="lb-heading" className="text-2xl font-semibold tracking-tight">
            Top verified startups
          </h2>
          <Link href="/leaderboard" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-ink-muted hover:text-brand">
            Full leaderboard <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <LeaderboardTable listings={listings} sort="mrr" range="all" limit={5} compact />
      </section>

      {/* How it works: a real sequence, so it is numbered */}
      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t border-line pt-5">
              <span className="num text-sm font-semibold text-brand">{i + 1}</span>
              <h3 className="mt-2 text-base font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          See the full walkthrough <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </section>

      <section className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-ink px-7 py-9 text-bg dark:border dark:border-line dark:bg-surface dark:text-ink md:flex-row md:items-center md:px-10">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Selling a startup?</h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 opacity-75">Get a verified revenue profile buyers can trust, in minutes and for free.</p>
        </div>
        <Button asChild size="lg" className="h-12 px-6">
          <Link href="/signup?role=founder">List your startup</Link>
        </Button>
      </section>
    </div>
  )
}

/** The hero's one bold element: a live verified profile, its revenue line drawing in once on load. */
function ProofCard({ l }: { l: ListingFull }) {
  const m = l.metrics!
  const rows = m.monthly.slice(-12)
  const vals = rows.map((r) => r.net)
  const W = 400
  const H = 120
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pts = vals.map((v, i) => [vals.length > 1 ? (i / (vals.length - 1)) * W : W / 2, H - 8 - ((v - lo) / (hi - lo || 1)) * (H - 24)])
  // smooth curve through the points (catmull-rom as cubic beziers)
  const g = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))]
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [g(i - 1), g(i), g(i + 1), g(i + 2)]
    const k = 0.18
    line += `C${(p1[0] + (p2[0] - p0[0]) * k).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * k).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * k).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * k).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  const last = pts[pts.length - 1]

  return (
    <Link
      href={`/listing/${l.id}`}
      className="group relative block min-w-0 rounded-2xl border border-line bg-surface p-6 shadow-pop transition-colors duration-150 hover:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:p-7"
    >
      <div className="flex items-center gap-3">
        <InitialAvatar name={l.name} size={40} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{l.name}</span>
            {l.is_demo && <DemoTag />}
          </div>
          <p className="truncate text-sm text-ink-muted">{l.pitch}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-caption font-medium text-brand">#1 by MRR</span>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-ink-muted">Monthly recurring revenue</div>
          <div className="num mt-1 text-[40px] font-semibold leading-none tracking-tight md:text-[46px]">{inr(Math.round(m.mrr))}</div>
        </div>
        <Growth value={m.growth_pct} className="mb-1 text-sm" />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 h-auto w-full overflow-visible" role="img" aria-label={`Net revenue by month for ${l.name}`}>
        <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="stroke-line" strokeWidth="1" />
        <path d={line} fill="none" className="proof-line stroke-brand" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
        <circle cx={last[0]} cy={last[1]} r="4.5" className="fill-brand" />
      </svg>
      <div className="mt-2 flex justify-between text-caption text-ink-muted">
        <span>{rows[0] && monthLabel(rows[0].month)}</span>
        <span>{rows.length > 0 && monthLabel(rows[rows.length - 1].month)}</span>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <BadgeCheck className="size-4 text-verified" aria-hidden="true" /> Checked from Razorpay payment data
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-ink group-hover:text-brand">
          View <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
