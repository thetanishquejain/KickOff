import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BadgeCheck, ExternalLink, Lock } from "lucide-react"

import { getProfile } from "@/lib/auth"
import { askingMultiple, getListing, getPosts, getPublishedListings, kycStatus, rangeStats } from "@/lib/data"
import { hasInsights, INSIGHT_FIELDS } from "@/lib/insights"
import { isForSale } from "@/lib/market-query"
import { PostCard } from "@/components/post-card"
import { PostComposer } from "@/components/post-composer"
import { ensureFlagExplanations } from "@/lib/explain"
import { inr, inrShort, monthLabel, multiple, pct } from "@/lib/format"
import { revenueInRange } from "@/lib/metrics"
import { getOrCreateSummary } from "@/lib/summary"
import { Button } from "@/components/ui/button"
import { AiTag, DemoTag, Growth, InitialAvatar, KycBadge } from "@/components/kit"
import { ForSaleTag } from "@/components/listing-row"
import { RevenueExplorer } from "@/components/revenue-explorer"
import { AnalyticsBento } from "@/components/ui/analytics-bento"
import { buildListingBento } from "@/lib/bento"
import { FlagList, VerifiedProfile } from "@/components/verified-profile"

import { BackLink } from "./back-link"
import { AskChat } from "./chat"
import { SectionTabs } from "./section-tabs"
import { ShareButton } from "./share-button"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function generateMetadata({ params }: { params: { id: string } }) {
  const l = await getListing(params.id)
  return { title: l?.name ?? "Listing" }
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const [found, profile, published] = await Promise.all([getListing(params.id), getProfile(), getPublishedListings()])
  const [posts, founderKyc, viewerKyc] = found
    ? await Promise.all([getPosts({ listingId: found.id, limit: 20, viewerId: profile?.id }), kycStatus(found.founder_id), profile ? kycStatus(profile.id) : Promise.resolve(null)])
    : [[], null, null]
  if (!found) notFound()
  const l = await ensureFlagExplanations(found)
  const m = l.metrics
  const isOwner = profile?.id === l.founder_id
  const traffic = m ? rangeStats(l, "6m") : null
  const demoTraffic = l.traffic.some((t) => t.is_demo)
  const mult = askingMultiple(l)
  const bento = buildListingBento(l)
  const ranked = published.filter((p) => p.metrics).sort((a, b) => b.metrics!.mrr - a.metrics!.mrr)
  const rank = m && l.status === "published" ? ranked.findIndex((p) => p.id === l.id) + 1 : 0
  const founderCount = published.filter((p) => p.founder_id === l.founder_id).length
  const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })

  return (
    <div className="pb-24 lg:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2 pt-6">
        <BackLink />
        <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/marketplace" className="hover:text-ink">
                Marketplace
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/marketplace?category=${encodeURIComponent(l.category)}`} className="hover:text-ink">
                {l.category}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {l.name}
            </li>
          </ol>
        </nav>
      </div>

      {l.status !== "published" && (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          Preview of a draft: only you can see this page.{" "}
          {isOwner && (
            <Link href={`/listing/${l.id}/edit`} className="font-medium text-brand hover:underline">
              Review and publish
            </Link>
          )}
        </p>
      )}

      <header className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <InitialAvatar name={l.name} size={60} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{l.name}</h1>
              {m && (
                <span className="inline-flex items-center gap-1 rounded-full bg-verified/10 px-2 py-0.5 text-caption font-medium text-verified">
                  <BadgeCheck className="size-3.5" aria-hidden="true" /> Revenue checked
                </span>
              )}
              {isForSale(l) ? <ForSaleTag /> : null}
              {l.is_demo && <DemoTag />}
            </div>
            <p className="mt-1 max-w-2xl text-ink-muted">{l.pitch}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
              <span>{l.category}</span>
              <span aria-hidden="true">·</span>
              {l.status === "published" ? (
                <Link href={`/founder/${l.founder_id}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                  <InitialAvatar name={l.founder_name} size={20} className="rounded-full" /> {l.founder_name ?? "Founder"}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <InitialAvatar name={l.founder_name} size={20} className="rounded-full" /> {l.founder_name ?? "Founder"}
                </span>
              )}
              <KycBadge status={founderKyc} />
              {l.website && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{l.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareButton title={l.name} />
          {l.website && (
            <Button asChild size="sm" variant="secondary">
              <a href={l.website} target="_blank" rel="noopener noreferrer">
                Visit <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          )}
          {isOwner && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/listing/${l.id}/edit`}>Edit</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/dashboard/${l.id}`}>Manage</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="All-time revenue" value={m ? inr(revenueInRange(m, "all")) : "Not verified"} sub={rank ? `Ranked #${rank} on Kickoff by MRR` : m ? "Not ranked until published" : "Upload payments to verify"} />
        <StatCard label="MRR" value={m ? inr(Math.round(m.mrr)) : "–"} sub={m ? `${m.customers_6m.toLocaleString("en-IN")} paying customers in 6 months` : "–"} />
        <StatCard
          label="Founder"
          value={
            <span className="flex min-w-0 items-center gap-2">
              <InitialAvatar name={l.founder_name} size={28} className="rounded-full" />
              <span className="truncate">{l.founder_name ?? "Not shared"}</span>
            </span>
          }
          sub={`${founderCount || 1} ${founderCount === 1 || !founderCount ? "startup" : "startups"} on Kickoff${founderKyc === "verified_test" ? " · KYC (test)" : ""}`}
        />
        <StatCard
          label={l.founded_on ? "Founded" : "Payment history"}
          value={l.founded_on ? new Date(l.founded_on).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : m?.first_month ? `Since ${monthLabel(m.first_month)}` : "–"} sub={m ? `${m.monthly.length} full ${m.monthly.length === 1 ? "month" : "months"} · ${m.payment_count.toLocaleString("en-IN")} payments` : "No payments uploaded"} />
      </dl>
      {m && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-caption text-ink-muted">
          <BadgeCheck className="size-3.5 text-verified" aria-hidden="true" />
          Revenue calculated from {l.data_source === "razorpay_api" ? "the Razorpay API (test mode)" : "a Razorpay payments export"}{l.is_demo ? " (demo data)" : ""}.{l.computed_at ? ` Last updated ${fmtDate(l.computed_at)}.` : ""}
        </p>
      )}

      {bento && (
        <section aria-labelledby="analytics-h" className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 id="analytics-h" className="text-lg font-semibold tracking-tight">
              Revenue analytics
            </h2>
            <p className="text-caption text-ink-muted">Calculated by code from {l.name}&apos;s payment data{demoTraffic ? " · traffic is demo data" : ""}</p>
          </div>
          <AnalyticsBento
            {...bento}
            credit={false}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            monoFamily="var(--font-geist-mono), ui-monospace, monospace"
          />
        </section>
      )}

      <div className="mt-6">
        <SectionTabs riskCount={l.flags.length} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section id="overview" aria-labelledby="ov-h" className="scroll-mt-32">
            <h2 id="ov-h" className="mb-3 text-lg font-semibold">
              Overview
            </h2>
            <div>
              <h3 className="text-sm font-semibold">About {l.name}</h3>
              {l.description ? (
                <>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{l.description}</p>
                  <p className="mt-2 text-caption text-ink-muted">Written by the founder. The numbers on this page are calculated from payment data; this text is not checked.</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">The founder hasn&apos;t added a description yet.</p>
              )}
            </div>
            <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Fact k="Category" v={l.category} />
              <Fact k="Founder" v={l.founder_name ?? "Not shared"} />
              <Fact k="Data source" v={m ? (l.data_source === "razorpay_api" ? "Razorpay API (test mode)" : "Razorpay payments export") : "No payment data yet"} />
              <Fact k="Data covers" v={m?.first_month && m.latest_month ? `${monthLabel(m.first_month)} to ${monthLabel(m.latest_month)}` : "–"} />
              <Fact k="Paying customers (6 mo)" v={m ? m.customers_6m.toLocaleString("en-IN") : "–"} />
              <Fact
                k="Website traffic (6 mo)"
                v={traffic?.visitors != null ? `${traffic.visitors.toLocaleString("en-IN")} visitors${demoTraffic ? " (demo data)" : " (Google Analytics)"}` : "Not connected"}
              />
            </dl>

            {hasInsights(l.insights) && (
              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">Startup insights</h3>
                  <span className="text-caption text-ink-muted">Written by the founder · not verified</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {l.insights?.value_proposition && <InsightCard label="Value proposition" wide text={l.insights.value_proposition} large />}
                  {INSIGHT_FIELDS.filter((f) => f.key !== "value_proposition" && f.key !== "tech_stack" && l.insights?.[f.key]).map((f) => (
                    <InsightCard key={f.key} label={f.label} text={l.insights![f.key]!} wide={f.key === "extra" || f.key === "problem"} />
                  ))}
                  {(l.insights?.customer_type || l.insights?.tech_stack) && (
                    <div className="rounded-lg border border-line bg-surface p-4">
                      {l.insights?.customer_type && (
                        <>
                          <div className="text-caption font-medium uppercase tracking-wide text-ink-muted">Customers</div>
                          <span className="mt-1.5 inline-block rounded-md border border-line px-2 py-0.5 text-label">{l.insights.customer_type}</span>
                        </>
                      )}
                      {l.insights?.tech_stack && (
                        <>
                          <div className="mt-3 text-caption font-medium uppercase tracking-wide text-ink-muted first:mt-0">Tech stack</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {l.insights.tech_stack.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                              <span key={t} className="rounded-md border border-line bg-bg px-2 py-0.5 text-label">
                                {t}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {isOwner && !hasInsights(l.insights) && (
              <p className="mt-6 rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">
                Add startup insights (audience, pricing, tech stack) so buyers understand the business.{" "}
                <Link href={`/listing/${l.id}/edit`} className="font-medium text-brand hover:underline">
                  Add insights
                </Link>
              </p>
            )}
          </section>

          <section id="financials" aria-labelledby="fin-h2" className="scroll-mt-32">
            <h2 id="fin-h2" className="mb-3 text-lg font-semibold">
              Financials
            </h2>
            {m ? (
              <VerifiedProfile m={m} flags={l.flags} computedAt={l.computed_at} showFlags={false} chart={<RevenueExplorer m={m} />} />
            ) : (
              <p className="rounded-lg border border-dashed border-line p-6 text-sm text-ink-muted">No payment data has been uploaded for this listing yet, so there are no verified financials to show.</p>
            )}
          </section>

          <section id="risks" className="scroll-mt-32">
            {m ? <FlagList flags={l.flags} /> : <p className="text-sm text-ink-muted">Risk checks run once payment data is uploaded.</p>}
          </section>

          <section id="updates" aria-labelledby="upd-h" className="scroll-mt-32">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 id="upd-h" className="text-lg font-semibold">
                Founder updates
              </h2>
              <Link href="/feed" className="text-caption text-ink-muted hover:text-brand">
                All updates →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {isOwner && <PostComposer listingId={l.id} listingName={l.name} />}
              {posts.length ? (
                posts.map((p) => <PostCard key={p.id} p={p} viewerId={profile?.id} hideListing />)
              ) : (
                <p className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">No updates from the founder yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside id="analysis" aria-label="Deal and buyer analysis" className="flex scroll-mt-32 flex-col gap-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5 shadow-card">
            <div className="text-caption text-ink-muted">Asking price</div>
            <div className="num mt-0.5 text-3xl font-semibold">{l.asking_price_inr ? inrShort(l.asking_price_inr) : "Not set"}</div>
            {l.asking_price_inr ? <div className="num text-caption text-ink-muted">{inr(l.asking_price_inr)}</div> : null}
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <div>
                <dt className="text-caption text-ink-muted">Multiple</dt>
                <dd className="num font-semibold">{mult !== null ? multiple(mult) : "–"}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">ARR</dt>
                <dd className="num font-semibold">{m ? inrShort(m.arr) : "–"}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">MoM growth</dt>
                <dd>
                  <Growth value={m?.growth_pct} className="font-semibold" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">Largest customer</dt>
                <dd className="num font-semibold">{m ? pct(m.top_customer_pct) : "–"}</dd>
              </div>
            </dl>
            {!profile && (
              <Button asChild className="mt-4 w-full">
                <Link href={`/signup?role=buyer&next=/listing/${l.id}`}>Sign up free to analyse</Link>
              </Button>
            )}
          </div>

          {profile ? (
            <>
              <Suspense fallback={<SummarySkeleton />}>
                <BuyerSummaryCard listingId={l.id} />
              </Suspense>
              {!isOwner && viewerKyc !== "verified_test" && (
                <p className="rounded-lg border border-line bg-surface p-3 text-caption text-ink-muted">
                  Complete <Link href="/account/kyc" className="font-medium text-brand hover:underline">KYC verification</Link> (test mode) so founders know a verified buyer is asking.
                </p>
              )}
              {m ? (
                <AskChat listingId={l.id} name={l.name} />
              ) : (
                <p className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">Chat opens once this listing has verified payment data.</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-line bg-surface p-5">
              <Lock className="size-4 text-brand" aria-hidden="true" />
              <h2 className="text-sm font-semibold">AI buyer summary and chat</h2>
              <p className="text-sm text-ink-muted">
                Free buyer accounts can read what the payment data proves, what&apos;s missing and what to ask, and question this startup&apos;s data.
              </p>
              <Link href={`/login?next=/listing/${l.id}`} className="text-sm font-medium text-brand hover:underline">
                Already have an account? Log in
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Phones: keep the price and the next action in reach while scrolling */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-caption text-ink-muted">Asking price{mult !== null ? ` · ${multiple(mult)} ARR` : ""}</div>
            <div className="num truncate text-lg font-semibold">{l.asking_price_inr ? inrShort(l.asking_price_inr) : "Not set"}</div>
          </div>
          <Button asChild size="sm">
            <a href="#analysis">{profile ? "AI analysis and chat" : "Analyse this startup"}</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
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
        <h2 className="text-sm font-semibold">Buyer summary</h2>
        <AiTag>AI summary</AiTag>
      </div>
      {s.status === "ok" ? (
        <div className="flex flex-col gap-4 text-sm">
          <Block title="What is proven" items={s.summary.proven} tone="text-verified" />
          <Block title="What is missing" items={s.summary.missing} tone="text-warning" />
          <Block title="Questions to ask" items={s.summary.ask_next} tone="text-brand" />
          <p className="border-t border-line pt-3 text-caption text-ink-muted">AI interpretation of the payment-derived metrics. Every number was checked against them. Not an audit.</p>
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

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface p-4 shadow-card">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="num mt-1.5 truncate text-xl font-semibold md:text-2xl">{value}</dd>
      <dd className="mt-1 truncate text-caption text-ink-muted">{sub}</dd>
    </div>
  )
}

function InsightCard({ label, text, wide, large }: { label: string; text: string; wide?: boolean; large?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="text-caption font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <p className={`mt-1.5 whitespace-pre-line text-ink ${large ? "text-base font-medium leading-6" : "text-sm leading-6"}`}>{text}</p>
    </div>
  )
}
