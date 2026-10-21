import Link from "next/link"
import { ArrowRight, BadgeCheck } from "lucide-react"

import { getPublishedListings } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/kit"
import { LeaderboardTable } from "@/components/leaderboard"
import { ListingCard } from "@/components/listing-card"

export const dynamic = "force-dynamic"

const FOUNDER_STEPS = [
  ["Create a listing", "Name, category, one-line pitch and an asking price in rupees."],
  ["Upload your Razorpay payments", "Export the payments CSV from Razorpay. AI sorts each payment into recurring, one-time or refund, and you can correct any label."],
  ["Review your numbers", "Code calculates MRR, growth, refunds and customer concentration, and raises risk flags."],
  ["Publish", "Edit the AI-drafted description, then publish to the marketplace and leaderboard."],
]

const BUYER_STEPS = [
  ["Browse verified startups", "Filter by category and compare MRR, asking price and multiple."],
  ["Read the buyer summary", "What the payment data proves, what it doesn't, and what to ask next."],
  ["Question the data", "Ask about revenue, customers or risks. Answers use only that listing's data."],
  ["Talk to the founder", "Take the suggested questions into your own due diligence."],
]

const FAQ = [
  [
    'What does "verified" mean on Kickoff?',
    "It means the numbers were calculated by Kickoff's code from the Razorpay payments export the founder uploaded, instead of typed in or shown as a screenshot. It doesn't mean the business has been audited, and Kickoff doesn't yet confirm that the export is complete or that the founder owns the business.",
  ],
  [
    "How is MRR calculated?",
    "MRR is the recurring revenue in the latest full month of data. Monthly plans count in the month they're paid, and yearly plans are spread across 12 months. One-time payments and refunds are not part of MRR.",
  ],
  [
    "Where does AI come in?",
    "AI labels messy payment descriptions, explains risk flags in plain English, drafts listing descriptions and answers buyer questions. AI never calculates the numbers, and any AI text whose numbers don't match the calculated metrics is blocked.",
  ],
  [
    "What happens to customer data in the CSV?",
    "Customer emails, phone numbers and IDs are turned into one-way codes before storage. Raw payment rows are visible only to the founder who uploaded them.",
  ],
  [
    "What are risk flags?",
    "Automatic checks for patterns buyers care about: one customer bringing in more than 30% of revenue, a month more than twice the 3-month average, and refunds above 10% of revenue.",
  ],
  [
    "Which payment gateways are supported?",
    "Razorpay CSV exports today. Cashfree, PayU and live connections are planned for a later version.",
  ],
]

export default async function Home() {
  const listings = await getPublishedListings()
  const verified = listings.filter((l) => l.metrics)
  const preview = [...verified].sort((a, b) => (b.metrics?.mrr ?? 0) - (a.metrics?.mrr ?? 0)).slice(0, 6)
  const totalMrr = verified.reduce((s, l) => s + (l.metrics?.mrr ?? 0), 0)

  return (
    <div className="flex flex-col gap-20 pb-8">
      <section className="grid gap-10 pt-12 md:grid-cols-[1.25fr_1fr] md:items-center md:pt-20">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight md:text-[52px]">
            Buy and sell Indian startups on revenue you can check.
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-muted md:text-lg">
            Founders prepare their SaaS or AI product for sale with metrics calculated from Razorpay payments. Buyers
            compare listings and question every number before they talk.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/marketplace">Browse startups</Link>
            </Button>
            <Link href="/signup?role=founder" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-brand">
              List your startup <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <aside className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2 text-sm font-medium text-verified">
            <BadgeCheck className="size-4" aria-hidden="true" /> What &quot;verified&quot; means here
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-muted">
            <li>Metrics are calculated by code from the founder&apos;s Razorpay payment export.</li>
            <li>AI writes explanations, and a number check blocks figures that don&apos;t match the data.</li>
            <li>It is not an audit. Identity and ownership checks come in a later version.</li>
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <dt className="text-caption text-ink-muted">Verified listings</dt>
              <dd className="num text-2xl font-semibold">{verified.length}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">Combined MRR</dt>
              <dd className="num text-2xl font-semibold">{inrShort(totalMrr)}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section aria-labelledby="preview-heading">
        <SectionHead id="preview-heading" title="Startups on Kickoff" href="/marketplace" link="View marketplace" />
        {preview.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((l) => (
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

      <section aria-labelledby="lb-heading">
        <SectionHead id="lb-heading" title="Leaderboard by verified MRR" href="/leaderboard" link="Full leaderboard" />
        <LeaderboardTable listings={listings} sort="mrr" range="all" limit={5} compact />
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-24">
        <h2 id="how-heading" className="mb-6 text-xl font-semibold tracking-tight">
          How it works
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Journey title="For founders" steps={FOUNDER_STEPS} />
          <Journey title="For buyers" steps={BUYER_STEPS} />
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-heading" className="grid scroll-mt-24 gap-8 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="faq-heading" className="text-xl font-semibold tracking-tight">
            Trust and FAQ
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            How payment data is processed, what the metrics mean, and what verification does and doesn&apos;t prove.
          </p>
        </div>
        <div className="divide-y divide-line rounded-lg border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink">
                {q}
                <span className="text-ink-muted transition-transform duration-150 group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHead({ id, title, href, link }: { id: string; title: string; href: string; link: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand">
        {link} <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}

function Journey({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h3 className="font-medium">{title}</h3>
      <ol className="mt-4 flex flex-col gap-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
            <span className="num flex size-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{i + 1}</span>
            <div>
              <div className="text-sm font-medium text-ink">{t}</div>
              <p className="mt-0.5 text-sm text-ink-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
