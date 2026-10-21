import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, Lock } from "lucide-react"

import { getProfile } from "@/lib/auth"
import { askingMultiple, getListing, rangeStats } from "@/lib/data"
import { inr, inrShort, multiple } from "@/lib/format"
import { getOrCreateSummary } from "@/lib/summary"
import { Button } from "@/components/ui/button"
import { AiTag, DemoTag, InitialAvatar, MetricTile } from "@/components/kit"
import { VerifiedProfile } from "@/components/verified-profile"

import { AskChat } from "./chat"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function generateMetadata({ params }: { params: { id: string } }) {
  const l = await getListing(params.id)
  return { title: l?.name ?? "Listing" }
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const [l, profile] = await Promise.all([getListing(params.id), getProfile()])
  if (!l) notFound()
  const isOwner = profile?.id === l.founder_id
  const traffic = l.metrics ? rangeStats(l, "6m") : null
  const demoTraffic = l.traffic.some((t) => t.is_demo)

  return (
    <div className="grid gap-10 pt-10 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-4">
          {l.status !== "published" && (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">Draft: only you can see this page.</p>
          )}
          <div className="flex items-start gap-4">
            <InitialAvatar name={l.name} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{l.name}</h1>
                {l.is_demo && <DemoTag />}
              </div>
              <p className="text-ink-muted">{l.pitch}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {l.category} · by {l.founder_name ?? "Founder"}
                {l.website && (
                  <>
                    {" · "}
                    <a href={l.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-saffron">
                      Website <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetricTile label="Asking price" value={inrShort(l.asking_price_inr)} sub={l.asking_price_inr ? inr(l.asking_price_inr) : "Not set"} />
            <MetricTile label="Multiple of ARR" value={multiple(askingMultiple(l))} sub="Asking price ÷ (MRR × 12)" />
            <MetricTile
              label="Visitors, last 6 months"
              value={traffic?.visitors != null ? traffic.visitors.toLocaleString("en-IN") : "–"}
              sub={
                traffic?.visitors != null ? (
                  <span className="inline-flex items-center gap-1.5">
                    {traffic.perVisitor != null ? `${inr(traffic.perVisitor, { decimals: 2 })} per visitor` : ""}
                    {demoTraffic ? <DemoTag /> : <span>· Google Analytics</span>}
                  </span>
                ) : (
                  "Traffic not connected"
                )
              }
            />
          </div>
        </header>

        {l.metrics ? (
          <VerifiedProfile m={l.metrics} flags={l.flags} computedAt={l.computed_at} />
        ) : (
          <p className="rounded-lg border border-line bg-surface p-6 text-ink-muted">This listing has no verified payment data yet.</p>
        )}

        {l.description && (
          <section>
            <h2 className="mb-2 text-lg font-medium">About {l.name}</h2>
            <p className="whitespace-pre-line text-sm leading-6 text-ink">{l.description}</p>
            <p className="mt-2 text-xs text-ink-muted">Written by the founder. Numbers above are verified; this text is not.</p>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        {profile ? (
          <>
            <Suspense fallback={<SummarySkeleton />}>
              <BuyerSummaryCard listingId={l.id} />
            </Suspense>
            {l.metrics && <AskChat listingId={l.id} name={l.name} />}
            {isOwner && (
              <Button asChild variant="secondary">
                <Link href={`/dashboard/${l.id}`}>Manage listing</Link>
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-6">
            <Lock className="size-5 text-saffron" aria-hidden="true" />
            <h2 className="font-medium">See the AI buyer summary</h2>
            <p className="text-sm text-ink-muted">
              Sign up free as a buyer to read what's proven, what's missing and what to ask, and to question this startup's data.
            </p>
            <Button asChild>
              <Link href={`/login?mode=signup&role=buyer&next=/listing/${l.id}`}>Sign up as a buyer</Link>
            </Button>
          </div>
        )}
      </aside>
    </div>
  )
}

async function BuyerSummaryCard({ listingId }: { listingId: string }) {
  const l = await getListing(listingId)
  if (!l) return null
  const s = await getOrCreateSummary(l)
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Buyer summary</h2>
        <AiTag>AI summary</AiTag>
      </div>
      {s.status === "ok" ? (
        <div className="flex flex-col gap-4 text-sm">
          <Block title="What is proven" items={s.summary.proven} tone="text-verified" />
          <Block title="What is missing" items={s.summary.missing} tone="text-warning" />
          <Block title="Ask next" items={s.summary.ask_next} tone="text-saffron" />
          <p className="border-t border-line pt-3 text-xs text-ink-muted">Written by AI. Every number checked against verified data.</p>
        </div>
      ) : s.status === "under_review" ? (
        <p className="text-sm text-ink-muted">Summary under review: the AI draft used a number we couldn't match to the data, so we're not showing it.</p>
      ) : (
        <p className="text-sm text-ink-muted">{s.reason}</p>
      )}
    </div>
  )
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <h3 className={`mb-1 text-xs font-medium uppercase tracking-wide ${tone}`}>{title}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-ink">
        {(items ?? []).map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div className="rounded-lg border border-line bg-surface p-5" aria-busy="true">
      <div className="mb-3 h-5 w-32 animate-pulse rounded bg-surface-hover" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-surface-hover" style={{ width: `${90 - i * 8}%` }} />
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted">AI is reading the verified data…</p>
    </div>
  )
}
