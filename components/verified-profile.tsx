import { CheckCircle2 } from "lucide-react"

import type { FlagRow } from "@/lib/data"
import { inr, inrShort, monthLabel, pct } from "@/lib/format"
import { revenueInRange, type Metrics } from "@/lib/metrics"
import { cn } from "@/lib/utils"

import { AiTag, Growth, MetricTile, VerifiedBadge } from "./kit"
import { RevenueChart } from "./revenue-chart"

export function VerifiedProfile({ m, flags, computedAt, showFlags = true }: { m: Metrics; flags: FlagRow[]; computedAt: string | null; showFlags?: boolean }) {
  const latest = m.latest_month ? monthLabel(m.latest_month) : "latest month"
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
        <VerifiedBadge label="Calculated from Razorpay data" />
        <span>
          {m.payment_count.toLocaleString("en-IN")} payments · {m.first_month ? monthLabel(m.first_month) : ""} to {latest}
          {computedAt ? ` · checked ${new Date(computedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </span>
      </div>

      <section aria-labelledby="fin-heading">
        <h2 id="fin-heading" className="sr-only">
          Financial overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricTile big label={`MRR (${latest})`} value={inrShort(m.mrr)} sub={`ARR ${inrShort(m.arr)}`} hint="Recurring revenue in the latest full month. Yearly plans are spread over 12 months." />
          <MetricTile label="MoM growth" value={<Growth value={m.growth_pct} />} sub={m.growth_pct === null ? "Needs two months of data" : `vs ${inrShort(m.prev_mrr)} the month before`} hint="Change in MRR from the previous month." />
          <MetricTile label="Revenue, last 30 days" value={inrShort(revenueInRange(m, "30d"))} sub="Net of refunds" hint="Net revenue in the 30 days ending with the latest full month." />
          <MetricTile label="Revenue, last 6 months" value={inrShort(m.revenue_6m)} sub={`${pct(m.recurring_share_pct)} recurring`} hint="Net revenue across the last six full months." />
          <MetricTile label="Refund rate" value={pct(m.refund_pct)} sub="Last 6 months" hint="Refunded amount as a share of revenue collected." />
          <MetricTile label="Largest customer" value={pct(m.top_customer_pct)} sub={`${m.customers_6m.toLocaleString("en-IN")} paying customers`} hint="Share of 6-month revenue from the single biggest customer." />
        </div>
      </section>

      <section aria-labelledby="trend-heading" className="rounded-lg border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="trend-heading" className="text-sm font-medium">
            Monthly net revenue and MRR
          </h2>
          <span className="text-caption text-ink-muted">Source: Razorpay payments export · full months only</span>
        </div>
        <RevenueChart rows={m.monthly} />
      </section>

      {showFlags && <FlagList flags={flags} />}
    </div>
  )
}

type Severity = "High" | "Medium" | "Low"

export function flagSeverity(f: FlagRow): Severity {
  const d = f.detail
  if (f.type === "concentration") return Number(d.top_customer_pct) >= 50 ? "High" : "Medium"
  if (f.type === "spike") return Number(d.multiple) >= 3 ? "High" : "Medium"
  if (f.type === "refunds") return Number(d.refund_pct) >= 20 ? "High" : "Medium"
  return "Low"
}

function evidence(f: FlagRow): string {
  const d = f.detail
  switch (f.type) {
    case "concentration":
      return `Largest customer paid ${inr(Number(d.top_customer_revenue))} of ${inr(Number(d.revenue_6m))} in the last 6 months (${pct(Number(d.top_customer_pct))}). Flag threshold: ${d.threshold_pct}%.`
    case "spike":
      return `${monthLabel(String(d.month))}: ${inr(Number(d.month_revenue))} vs a 3-month average of ${inr(Number(d.prev_3_month_avg))} (${d.multiple}x). Flag threshold: 2x.`
    case "refunds":
      return `Refunds were ${pct(Number(d.refund_pct))} of revenue in the last 6 months. Flag threshold: ${d.threshold_pct}%.`
    default:
      return `${pct(Number(d.unclear_pct))} of revenue couldn't be labelled recurring or one-time.`
  }
}

const SEVERITY_TONE: Record<Severity, string> = {
  High: "border-danger/30 bg-danger/10 text-danger",
  Medium: "border-warning/30 bg-warning/10 text-warning",
  Low: "border-line bg-surface-hover text-ink-muted",
}

export function FlagList({ flags }: { flags: FlagRow[] }) {
  return (
    <section aria-labelledby="risk-heading" className="flex flex-col gap-3">
      <h2 id="risk-heading" className="text-base font-semibold">
        Risk analysis
      </h2>
      {!flags.length ? (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-4 text-sm">
          <CheckCircle2 className="size-4 text-verified" aria-hidden="true" />
          No risk flags found by Kickoff&apos;s checks on this payment data.
        </div>
      ) : (
        flags.map((f) => {
          const sev = flagSeverity(f)
          return (
            <article key={f.id} className="rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-ink">{f.title}</h3>
                <span className={cn("rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold", SEVERITY_TONE[sev])}>{sev} severity</span>
              </div>
              <p className="mt-2 text-sm text-ink">
                <span className="font-medium">Evidence: </span>
                {evidence(f)}
              </p>
              <p className="mt-0.5 text-caption text-ink-muted">Calculated by code from the payment data.</p>
              {f.ai_explanation ? (
                <div className="mt-3 rounded-md bg-surface-hover p-3">
                  <div className="mb-1">
                    <AiTag>AI explanation</AiTag>
                  </div>
                  <p className="text-sm text-ink">{f.ai_explanation}</p>
                  {f.buyer_question && (
                    <p className="mt-2 text-sm text-ink-muted">
                      <span className="font-medium text-ink">Ask the founder:</span> {f.buyer_question}
                    </p>
                  )}
                  <p className="mt-2 text-caption text-ink-muted">AI-written interpretation, not an audit.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">AI explanation not available yet.</p>
              )}
            </article>
          )
        })
      )}
    </section>
  )
}
