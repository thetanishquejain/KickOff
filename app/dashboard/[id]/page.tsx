import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/db/supabase/server"
import { ArrowLeft, Check, ExternalLink } from "lucide-react"

import { getProfile } from "@/lib/auth"
import { claudeConfigured } from "@/lib/claude"
import { askingMultiple, CATEGORIES, getListing } from "@/lib/data"
import { inrShort, monthLabel, multiple, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DemoTag, Growth, InitialAvatar, MetricTile } from "@/components/kit"
import { ForSaleTag } from "@/components/listing-row"
import { FlagList, VerifiedProfile } from "@/components/verified-profile"

import { DetailsPanel } from "./details-panel"
import { GaPanel } from "./ga-panel"
import { LabelsPanel, type LabelGroup } from "./labels-panel"
import { PaymentsTable, type PaymentRowView } from "./payments-table"
import { PublishPanel } from "./publish-panel"
import { UploadPanel } from "./upload-panel"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payments" },
  { id: "metrics", label: "Metrics & risks" },
  { id: "listing", label: "Listing" },
  { id: "preview", label: "Preview" },
  { id: "publish", label: "Publish" },
] as const
type Tab = (typeof TABS)[number]["id"]

export default async function ManageListingPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const profile = await getProfile()
  if (!profile) redirect(`/login?next=/dashboard/${params.id}`)
  const listing = await getListing(params.id)
  if (!listing || listing.founder_id !== profile.id) notFound()
  const tab = (TABS.find((t) => t.id === searchParams.tab)?.id ?? "overview") as Tab
  const m = listing.metrics
  const aiReady = claudeConfigured()
  const base = `/dashboard/${listing.id}`

  const checklist = [
    { ok: Boolean(m), text: "Revenue checked from your Razorpay payments", required: true, fixHref: `${base}?tab=payments` },
    { ok: Boolean(listing.description && listing.description.length >= 40), text: "Description written and reviewed by you", fixHref: `${base}?tab=listing` },
    { ok: Boolean(listing.asking_price_inr), text: "Asking price set (needed for the multiple)", fixHref: `${base}?tab=listing` },
    { ok: true, text: listing.flags.length ? `${listing.flags.length} risk flag${listing.flags.length > 1 ? "s" : ""} will be shown to buyers` : "No risk flags found" },
  ]
  const doneCount = checklist.filter((c) => c.ok).length

  const detailsProps = {
    listing: {
      id: listing.id,
      name: listing.name,
      category: listing.category,
      pitch: listing.pitch,
      website: listing.website,
      asking_price_inr: listing.asking_price_inr,
      description: listing.description,
      status: listing.status,
      insights: listing.insights ?? null,
      founded_on: listing.founded_on ?? null,
    },
    categories: CATEGORIES,
    hasMetrics: Boolean(m),
    aiReady,
    flagsCount: listing.flags.length,
  }

  return (
    <div className="pb-10">
      <div className="pt-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Dashboard
        </Link>
      </div>
      <header className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <InitialAvatar name={listing.name} size={48} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{listing.name}</h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-caption font-medium",
                  listing.status === "published" ? "bg-verified/10 text-verified" : "bg-surface-hover text-ink-muted"
                )}
              >
                {listing.status === "published" ? "Published" : "Draft"}
              </span>
            </div>
            <p className="truncate text-sm text-ink-muted">{listing.pitch}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/listing/${listing.id}`}>
              {listing.status === "published" ? "View public page" : "Open full preview"} <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
          {listing.status !== "published" && (
            <Button asChild size="sm">
              <Link href={`${base}?tab=publish`}>Publish</Link>
            </Button>
          )}
        </div>
      </header>

      <nav aria-label="Listing workspace" className="-mx-4 mt-5 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id === "overview" ? base : `${base}?tab=${t.id}`}
                aria-current={tab === t.id ? "page" : undefined}
                scroll={false}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors duration-150",
                  tab === t.id ? "border-brand font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
                )}
              >
                {t.label}
                {t.id === "metrics" && listing.flags.length > 0 && <span className="num rounded-full bg-warning/15 px-1.5 text-caption text-warning">{listing.flags.length}</span>}
                {t.id === "payments" && !m && <span className="size-1.5 rounded-full bg-brand" aria-label="Needs attention" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricTile label="MRR" value={m ? inrShort(m.mrr) : "–"} sub={m ? <Growth value={m.growth_pct} className="text-caption" /> : "Upload payments to calculate"} />
              <MetricTile label="Revenue, 6 months" value={m ? inrShort(m.revenue_6m) : "–"} sub={m ? `${pct(m.recurring_share_pct)} recurring` : "–"} />
              <MetricTile label="Asking price" value={listing.asking_price_inr ? inrShort(listing.asking_price_inr) : "Not set"} sub={askingMultiple(listing) !== null ? `${multiple(askingMultiple(listing))} ARR` : "Multiple needs MRR and a price"} />
              <MetricTile label="Risk flags" value={m ? String(listing.flags.length) : "–"} sub={m ? (listing.flags.length ? "Shown to buyers" : "None found") : "Checked after upload"} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-lg border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Progress</h2>
                  <span className="num text-caption text-ink-muted">
                    {doneCount}/{checklist.length}
                  </span>
                </div>
                <ul className="mt-3 flex flex-col divide-y divide-line">
                  {checklist.map((c) => (
                    <li key={c.text} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {c.ok ? <Check className="size-4 text-verified" aria-hidden="true" /> : <span className="size-4 rounded-full border border-line" aria-hidden="true" />}
                        {c.text}
                      </span>
                      {!c.ok && c.fixHref && (
                        <Link href={c.fixHref} className="text-caption font-medium text-brand hover:underline">
                          Do this
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-lg border border-line bg-surface p-5">
                <h2 className="text-sm font-semibold">Data</h2>
                <dl className="mt-3 flex flex-col divide-y divide-line text-sm">
                  <Row k="Source" v={m ? "Razorpay payments CSV" : "Not uploaded"} />
                  <Row k="Payments" v={m ? m.payment_count.toLocaleString("en-IN") : "–"} />
                  <Row k="Covers" v={m?.first_month && m.latest_month ? `${monthLabel(m.first_month)} to ${monthLabel(m.latest_month)}` : "–"} />
                  <Row k="Last checked" v={listing.computed_at ? new Date(listing.computed_at).toLocaleString("en-IN") : "–"} />
                  <Row k="AI" v={aiReady ? "Claude connected" : "Not configured (keyword rules used)"} />
                </dl>
                <Link href={`${base}?tab=payments`} className="mt-3 inline-block text-caption font-medium text-brand hover:underline">
                  {m ? "Re-upload payments" : "Upload payments"} →
                </Link>
              </section>
            </div>
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Website traffic <span className="font-normal text-ink-muted">(optional)</span>
                </h2>
                <p className="text-caption text-ink-muted">Connect Google Analytics to show verified visitors and revenue per visitor.</p>
              </div>
              <GaPanel listingId={listing.id} serviceEmail={process.env.GA_SERVICE_ACCOUNT_EMAIL ?? null} connection={listing.ga} hasDemoTraffic={listing.traffic.some((t) => t.is_demo)} />
            </section>
          </div>
        )}

        {tab === "payments" && <PaymentsTab listingId={listing.id} hasData={Boolean(m)} aiReady={aiReady} />}

        {tab === "metrics" &&
          (m ? (
            <VerifiedProfile m={m} flags={listing.flags} computedAt={listing.computed_at} />
          ) : (
            <NeedsData base={base} />
          ))}

        {tab === "listing" && (
          <div className="mx-auto max-w-3xl">
            <DetailsPanel {...detailsProps} />
          </div>
        )}

        {tab === "preview" && (
          <div className="flex flex-col gap-6">
            <p className="rounded-md border border-line bg-surface-hover p-3 text-sm text-ink-muted">
              This is how buyers will see your listing{listing.status !== "published" ? " once it's published" : ""}.{" "}
              <Link href={`/listing/${listing.id}`} className="font-medium text-brand hover:underline">
                Open the full page
              </Link>
            </p>
            <div className="rounded-lg border border-line bg-bg p-5">
              <div className="flex items-start gap-4">
                <InitialAvatar name={listing.name} size={52} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{listing.name}</h2>
                    {listing.asking_price_inr ? <ForSaleTag /> : null}
                    {listing.is_demo && <DemoTag />}
                  </div>
                  <p className="text-sm text-ink-muted">{listing.pitch}</p>
                  <p className="text-caption text-ink-muted">
                    {listing.category} · {listing.founder_name ?? "Founder"} · asking {listing.asking_price_inr ? inrShort(listing.asking_price_inr) : "not set"}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-sm font-semibold">About {listing.name}</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{listing.description || <span className="text-ink-muted">No description yet.</span>}</p>
              </div>
              <div className="mt-6">{m ? <VerifiedProfile m={m} flags={listing.flags} computedAt={listing.computed_at} /> : <FlagList flags={[]} />}</div>
            </div>
          </div>
        )}

        {tab === "publish" && <PublishPanel listingId={listing.id} status={listing.status} items={checklist} />}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  )
}

function NeedsData({ base }: { base: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      <p className="text-ink">No payment data yet.</p>
      <p className="max-w-sm text-sm text-ink-muted">Upload your Razorpay payments CSV and Kickoff will calculate your metrics and check for risks.</p>
      <Button asChild size="sm">
        <Link href={`${base}?tab=payments`}>Upload payments</Link>
      </Button>
    </div>
  )
}

async function PaymentsTab({ listingId, hasData, aiReady }: { listingId: string; hasData: boolean; aiReady: boolean }) {
  const db = createClient()
  const { data: payments } = await db
    .from("payments")
    .select("id, paid_at, description, amount_inr, status, label, billing_interval, label_source, label_reason")
    .eq("listing_id", listingId)
    .limit(5000)

  const groups = new Map<string, LabelGroup>()
  for (const p of payments ?? []) {
    if (p.status === "failed") continue
    const pattern = (p.description || "(no description)").trim().toLowerCase().replace(/\binv[-\s#]*\d+/g, "inv-####")
    const key = `${pattern}|${p.label}|${p.billing_interval}`
    const g = groups.get(key)
    if (g) {
      g.ids.push(p.id)
      g.total += Number(p.amount_inr)
    } else {
      groups.set(key, {
        key,
        example: p.description || "(no description)",
        ids: [p.id],
        total: Number(p.amount_inr),
        label: p.label,
        interval: p.billing_interval,
        source: p.label_source,
        reason: p.label_reason,
      })
    }
  }
  const labelGroups = [...groups.values()].sort((a, b) => b.total - a.total)
  const rows: PaymentRowView[] = (payments ?? []).map((p) => ({
    id: p.id,
    paid_at: p.paid_at,
    description: p.description,
    amount_inr: Number(p.amount_inr),
    status: p.status,
    label: p.label,
    interval: p.billing_interval,
    source: p.label_source,
    reason: p.label_reason,
  }))

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="up-h" className="flex flex-col gap-3">
        <h2 id="up-h" className="text-base font-semibold">
          Upload Razorpay payments
        </h2>
        <UploadPanel listingId={listingId} hasData={hasData} aiReady={aiReady} />
      </section>
      {rows.length > 0 && (
        <section aria-labelledby="rev-h" className="flex flex-col gap-3">
          <div>
            <h2 id="rev-h" className="text-base font-semibold">
              Review payment labels
            </h2>
            <p className="text-sm text-ink-muted">Each payment is labelled recurring, one-time, refund or unclear. Fix anything wrong and the numbers recalculate.</p>
          </div>
          <h3 className="text-sm font-medium">Quick fix by description</h3>
          <LabelsPanel listingId={listingId} groups={labelGroups} />
          <h3 className="mt-2 text-sm font-medium">Every payment</h3>
          <PaymentsTable listingId={listingId} rows={rows} />
        </section>
      )}
    </div>
  )
}
