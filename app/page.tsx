import Link from "next/link"
import { ArrowRight, BadgeCheck, Search } from "lucide-react"

import { askingMultiple, CATEGORIES, getPublishedListings } from "@/lib/data"
import { BUYER_STEPS, FAQ, FOUNDER_STEPS } from "@/lib/content"
import { inrShort } from "@/lib/format"
import { revenueInRange } from "@/lib/metrics"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/kit"
import { FaqList } from "@/components/faq-list"
import { LeaderboardTable } from "@/components/leaderboard"
import { ListingCard } from "@/components/listing-card"
import { ListingRows } from "@/components/listing-row"

export const dynamic = "force-dynamic"

export default async function Home() {
  const listings = await getPublishedListings()
  const verified = listings.filter((l) => l.metrics)
  const forSale = verified.filter((l) => l.asking_price_inr)
  const totalMrr = verified.reduce((s, l) => s + (l.metrics?.mrr ?? 0), 0)
  const rev30 = verified.reduce((s, l) => s + (l.metrics ? revenueInRange(l.metrics, "30d") : 0), 0)
  const totalAsk = forSale.reduce((s, l) => s + (l.asking_price_inr ?? 0), 0)

  const recent = [...forSale].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const bestValue = [...forSale]
    .filter((l) => askingMultiple(l) !== null)
    .sort((a, b) => (askingMultiple(a) ?? 99) - (askingMultiple(b) ?? 99))
    .slice(0, 5)
  const featured = [...verified].sort((a, b) => (b.metrics?.mrr ?? 0) - (a.metrics?.mrr ?? 0)).slice(0, 3)
  const categoryCounts = CATEGORIES.map((c) => ({ c, n: listings.filter((l) => l.category === c).length })).filter((x) => x.n > 0)

  return (
    <div className="flex flex-col gap-14 pb-6">
      {/* Compact hero: message, search, and live numbers above the fold */}
      <section className="grid gap-8 pt-10 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:pt-14">
        <div>
          <p className="mb-3 inline-flex items-center gap-1.5 text-caption font-medium text-verified">
            <BadgeCheck className="size-3.5" aria-hidden="true" /> Revenue calculated from Razorpay payment data
          </p>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.1] tracking-tight md:text-[44px]">
            The marketplace for Indian startups with revenue you can check.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-muted">
            Browse SaaS, AI products and apps for sale. Compare MRR, growth, asking price and risk flags before you talk to a founder.
          </p>
          <form action="/marketplace" role="search" className="mt-6 flex max-w-xl gap-2">
            <label htmlFor="hero-q" className="sr-only">
              Search startups
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="hero-q"
                name="q"
                placeholder="Search by name, category or what it does"
                className="h-11 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm shadow-card placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <Button type="submit" className="h-11">
              Search
            </Button>
          </form>
          <p className="mt-3 text-sm text-ink-muted">
            Selling?{" "}
            <Link href="/signup?role=founder" className="font-medium text-ink underline-offset-2 hover:text-brand hover:underline">
              List your startup free
            </Link>{" "}
            and get a verified profile in minutes.
          </p>
        </div>

        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          {[
            ["Verified startups", String(verified.length)],
            ["Combined MRR", inrShort(totalMrr)],
            ["Revenue, last 30 days", inrShort(rev30)],
            ["Total asking", forSale.length ? inrShort(totalAsk) : "–"],
          ].map(([k, v], i) => (
            <div key={k} className={`p-4 ${i % 2 === 0 ? "border-r border-line" : ""} ${i < 2 ? "border-b border-line" : ""}`}>
              <dt className="text-caption text-ink-muted">{k}</dt>
              <dd className="num mt-1 text-2xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Category discovery */}
      {categoryCounts.length > 0 && (
        <section aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="sr-only">
            Browse by category
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/marketplace" className="rounded-md border border-ink bg-ink px-3 py-1.5 text-sm font-medium text-bg">
              All startups <span className="num ml-1 opacity-70">{listings.length}</span>
            </Link>
            {categoryCounts.map(({ c, n }) => (
              <Link
                key={c}
                href={`/marketplace?category=${encodeURIComponent(c)}`}
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors duration-150 hover:border-ink-muted/40 hover:bg-surface-hover"
              >
                {c} <span className="num ml-1 text-ink-muted">{n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Listings lists */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ListingRows title="Recently listed" href="/marketplace?sort=new" linkLabel="All new listings" listings={recent} empty="No startups for sale yet." />
        <ListingRows title="Best value right now" href="/marketplace?sort=multiple" linkLabel="Sort by multiple" listings={bestValue} empty="No priced listings yet." />
      </div>

      {/* Featured */}
      <section aria-labelledby="feat-heading">
        <SectionHead id="feat-heading" title="Top verified opportunities" href="/marketplace" link="Open marketplace" />
        {featured.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <EmptyState title="No verified startups yet.">
            <Link href="/signup?role=founder" className="text-sm text-brand hover:underline">
              Be the first to list
            </Link>
          </EmptyState>
        )}
      </section>

      {/* Leaderboard preview */}
      <section aria-labelledby="lb-heading">
        <SectionHead id="lb-heading" title="Leaderboard by verified MRR" href="/leaderboard" link="Full leaderboard" />
        <LeaderboardTable listings={listings} sort="mrr" range="all" limit={5} compact />
      </section>

      {/* Verification + workflows */}
      <section aria-labelledby="how-heading" className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <h2 id="how-heading" className="text-xl font-semibold tracking-tight">
            How verification works
          </h2>
          <p className="text-sm leading-6 text-ink-muted">
            Founders upload the payments CSV exported from Razorpay. Kickoff&apos;s code works out MRR, growth, refunds and customer concentration. AI only writes
            explanations, and a number check blocks any figure that doesn&apos;t match the data.
          </p>
          <p className="text-sm leading-6 text-ink-muted">It&apos;s not an audit. Identity and ownership checks are planned for a later version.</p>
          <Link href="/how-it-works" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Full walkthrough <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <Steps title="For founders" steps={FOUNDER_STEPS.slice(0, 4)} />
        <Steps title="For buyers" steps={BUYER_STEPS.slice(0, 4)} />
      </section>

      {/* FAQ teaser */}
      <section aria-labelledby="faq-heading" className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="faq-heading" className="text-xl font-semibold tracking-tight">
            Questions buyers and founders ask
          </h2>
          <Link href="/faq" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            All FAQs <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <FaqList items={FAQ.slice(0, 4)} />
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-lg border border-line bg-surface p-6 shadow-card md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold">Selling a SaaS or AI product in India?</h2>
          <p className="mt-1 text-sm text-ink-muted">Get a verified revenue profile buyers can check, without sending screenshots back and forth.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/signup?role=founder">List your startup</Link>
        </Button>
      </section>
    </div>
  )
}

function SectionHead({ id, title, href, link }: { id: string; title: string; href: string; link: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand">
        {link} <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}

function Steps({ title, steps }: { title: string; steps: [string, string][] }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ol className="mt-3 flex flex-col gap-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[24px_1fr] gap-2.5">
            <span className="num flex size-6 items-center justify-center rounded-full bg-brand/10 text-caption font-semibold text-brand">{i + 1}</span>
            <div>
              <div className="text-sm font-medium text-ink">{t}</div>
              <p className="mt-0.5 text-label text-ink-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
