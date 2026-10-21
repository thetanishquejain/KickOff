import Link from "next/link"
import { BadgeCheck, FileSpreadsheet, MessageSquareText } from "lucide-react"

import { getPublishedListings } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { LeaderboardTable } from "@/components/leaderboard"

export const dynamic = "force-dynamic"

export default async function Home() {
  const listings = await getPublishedListings()
  const totalMrr = listings.reduce((s, l) => s + (l.metrics?.mrr ?? 0), 0)

  return (
    <div className="flex flex-col gap-16 pt-12 md:gap-24 md:pt-20">
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
            <span className="size-1.5 rounded-full bg-verified" /> Built for Indian payment gateways, starting with Razorpay
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Buy and sell Indian startups with <span className="text-saffron">revenue you can trust</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-muted md:text-lg">
            Founders upload their Razorpay payments and get a verified revenue profile in seconds. Buyers see real
            MRR, growth and risk flags, and can question every listing with AI.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login?mode=signup&role=founder">List your startup</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/marketplace">Browse verified startups</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Verified listings" value={String(listings.length)} />
          <Stat label="Combined verified MRR" value={inrShort(totalMrr)} />
          <div className="col-span-2 rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-sm text-verified">
              <BadgeCheck className="size-4" aria-hidden="true" /> Numbers come from payment data, not screenshots
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Code calculates every metric. AI explains them, and a number check blocks any figure that doesn't
              match the data.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="top-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="top-heading" className="text-2xl font-semibold">
            Top startups by verified MRR
          </h2>
          <Link href="/leaderboard" className="text-sm text-ink-muted hover:text-saffron">
            Full leaderboard →
          </Link>
        </div>
        <LeaderboardTable listings={listings} sort="mrr" range="all" limit={5} compact />
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="mb-6 text-2xl font-semibold">
          How Kickoff works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Step icon={<FileSpreadsheet className="size-5" />} title="1. Founder uploads payments">
            Export payments from Razorpay and upload the CSV. AI labels each payment as recurring, one-time or refund.
          </Step>
          <Step icon={<BadgeCheck className="size-5" />} title="2. Kickoff verifies the numbers">
            Code works out MRR, growth, refunds and customer concentration, and raises risk flags with plain-English
            explanations.
          </Step>
          <Step icon={<MessageSquareText className="size-5" />} title="3. Buyers check with AI">
            Buyers read an AI summary of what is proven and what is missing, and ask questions that are answered only
            from verified data.
          </Step>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="num mt-1 text-3xl font-bold">{value}</div>
    </div>
  )
}

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-saffron/10 text-saffron">{icon}</div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted">{children}</p>
    </div>
  )
}
