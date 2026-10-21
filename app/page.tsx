import Link from "next/link"

import { askingMultiple, getPublishedListings } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { LeaderboardTable } from "@/components/leaderboard"
import { ListingRows, StartupStrip } from "@/components/listing-row"

export const dynamic = "force-dynamic"

export default async function Home() {
  const listings = await getPublishedListings()
  const verified = listings.filter((l) => l.metrics)
  const totalMrr = verified.reduce((s, l) => s + (l.metrics?.mrr ?? 0), 0)
  const forSale = verified.filter((l) => l.asking_price_inr)

  const newest = [...forSale].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const bestValue = [...forSale]
    .filter((l) => askingMultiple(l) !== null)
    .sort((a, b) => (askingMultiple(a) ?? 99) - (askingMultiple(b) ?? 99))
    .slice(0, 5)
  const byMrr = [...verified].sort((a, b) => (b.metrics?.mrr ?? 0) - (a.metrics?.mrr ?? 0))

  return (
    <div className="flex flex-col gap-12 pt-10 md:pt-14">
      <section className="flex flex-col items-start gap-4">
        <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          Indian startups with <span className="text-saffron">verified revenue</span>, ready to buy and sell.
        </h1>
        <p className="max-w-2xl text-sm text-ink-muted md:text-base">
          Revenue checked from Razorpay payment data, not screenshots. Risk flags and AI analysis on every listing.
        </p>
        <p className="num text-xs text-ink-muted">
          {verified.length} verified startups · {inrShort(totalMrr)} combined MRR
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/marketplace">Browse startups for sale</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login?mode=signup&role=founder">+ List your startup</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <ListingRows title="New on Kickoff" href="/marketplace" linkLabel="All listings" listings={newest} empty="No startups for sale yet." />
        <ListingRows title="Best value right now" href="/marketplace" linkLabel="Marketplace" listings={bestValue} empty="No priced listings yet." />
      </div>

      <section aria-labelledby="lb-heading" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <h2 id="lb-heading" className="text-base font-semibold">
            Leaderboard · verified MRR
          </h2>
          <Link href="/leaderboard" className="text-xs text-ink-muted hover:text-saffron">
            Sort by growth, traffic and more →
          </Link>
        </div>
        <StartupStrip listings={byMrr} />
        <LeaderboardTable listings={listings} sort="mrr" range="all" limit={10} compact />
      </section>

      <section className="grid gap-3 rounded-lg border border-line bg-surface p-5 text-sm md:grid-cols-3">
        <p>
          <span className="font-semibold text-ink">1. Upload payments.</span>{" "}
          <span className="text-ink-muted">Founders upload a Razorpay CSV. AI labels every payment.</span>
        </p>
        <p>
          <span className="font-semibold text-ink">2. Get verified.</span>{" "}
          <span className="text-ink-muted">Code works out MRR, growth and risk flags. Numbers are checked.</span>
        </p>
        <p>
          <span className="font-semibold text-ink">3. Buyers check with AI.</span>{" "}
          <span className="text-ink-muted">A summary of what's proven and missing, plus a Q&A on the data.</span>
        </p>
      </section>
    </div>
  )
}
