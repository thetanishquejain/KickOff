import { CheckCircle2 } from "lucide-react"

import type { FlagRow } from "@/lib/data"
import { inr, inrShort, monthLabel, pct } from "@/lib/format"
import type { Metrics } from "@/lib/metrics"

import { AiTag, Growth, MetricTile, VerifiedBadge } from "./kit"
import { RevenueChart } from "./revenue-chart"

export function VerifiedProfile({ m, flags, computedAt }: { m: Metrics; flags: FlagRow[]; computedAt: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <VerifiedBadge label="Verified from Razorpay data" />
        <span>
          {m.payment_count.toLocaleString("en-IN")} payments · {m.first_month ? monthLabel(m.first_month) : ""} to{" "}
          {m.latest_month ? monthLabel(m.latest_month) : ""}
          {computedAt ? ` · checked ${new Date(computedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile big label={`MRR (${m.latest_month ? monthLabel(m.latest_month) : "latest"})`} value={inrShort(m.mrr)} sub={<Growth value={m.growth_pct} className="text-xs" />} />
        <MetricTile label="Revenue, last 6 months" value={inrShort(m.revenue_6m)} sub={`ARR ${inrShort(m.arr)}`} />
        <MetricTile label="Paying customers (6 mo)" value={m.customers_6m.toLocaleString("en-IN")} sub={`Recurring share ${pct(m.recurring_share_pct)}`} />
        <MetricTile
          label="Largest customer"
          value={pct(m.top_customer_pct)}
          sub={`Refunds ${pct(m.refund_pct)}`}
        />
      </div>
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="mb-3 text-sm text-ink-muted">Monthly net revenue and MRR</div>
        <RevenueChart rows={m.monthly} />
      </div>
      <FlagList flags={flags} />
    </div>
  )
}

export function FlagList({ flags }: { flags: FlagRow[] }) {
  if (!flags.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-4 text-sm">
        <CheckCircle2 className="size-4 text-verified" aria-hidden="true" />
        No risk flags found in the payment data.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-medium">Risk flags</h3>
      {flags.map((f) => (
        <div key={f.id} className="rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4">
          <div className="font-medium text-ink">{f.title}</div>
          {f.ai_explanation ? (
            <>
              <p className="mt-1 text-sm text-ink">{f.ai_explanation}</p>
              {f.buyer_question && (
                <p className="mt-2 text-sm text-ink-muted">
                  <span className="font-medium text-ink-muted">Ask the founder:</span> {f.buyer_question}
                </p>
              )}
              <div className="mt-2">
                <AiTag />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Found by Kickoff's checks. {flagHint(f)}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function flagHint(f: FlagRow) {
  switch (f.type) {
    case "concentration":
      return `If this customer leaves, revenue drops sharply. The threshold is ${f.detail.threshold_pct}%.`
    case "spike":
      return `One month is far above the months before it (${inr(Number(f.detail.month_revenue))} vs ${inr(Number(f.detail.prev_3_month_avg))} average).`
    case "refunds":
      return "A high refund rate can mean unhappy customers or billing problems."
    default:
      return "Some payments couldn't be classified as recurring or one-time."
  }
}
