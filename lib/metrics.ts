// Kickoff metrics engine. Code does the maths; AI never calculates numbers.

import { monthLabel } from "./format"

export type Label = "recurring" | "one_time" | "refund" | "unclear"
export type Interval = "monthly" | "yearly" | null

export type PaymentRow = {
  payment_id: string
  paid_at: string
  amount_inr: number
  status: string
  customer_key: string | null
  description: string
  label: Label | null
  interval: Interval
}

export type MonthRow = {
  month: string // YYYY-MM
  gross: number
  refunds: number
  net: number
  recurring: number
  one_time: number
  unclear: number
  mrr: number
  payments: number
}

export type Metrics = {
  mrr: number
  arr: number
  prev_mrr: number
  growth_pct: number | null
  revenue_last_month: number
  revenue_6m: number
  revenue_total: number
  refund_pct: number
  top_customer_pct: number
  top_customer_revenue: number
  customers_6m: number
  recurring_share_pct: number
  unclear_pct: number
  latest_month: string | null
  first_month: string | null
  payment_count: number
  monthly: MonthRow[]
  /** Net revenue per day [YYYY-MM-DD, ₹] for full months in the data. Used for "Last 30 days". */
  daily?: [string, number][]
}

export type FlagType = "concentration" | "spike" | "refunds" | "unclear"

export type Flag = {
  type: FlagType
  title: string
  detail: Record<string, number | string>
}

export const THRESHOLDS = {
  concentrationPct: 30,
  spikeMultiple: 2,
  refundPct: 10,
  unclearPct: 10,
}

const r2 = (n: number) => Math.round(n * 100) / 100
const r1 = (n: number) => Math.round(n * 10) / 10

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthRange(from: string, to: string): string[] {
  const out: string[] = []
  let k = from
  while (k <= to) {
    out.push(k)
    k = addMonths(k, 1)
  }
  return out
}

/** Payments that actually moved money into the account at some point. */
function isCaptured(p: PaymentRow) {
  return p.status === "captured" || p.status === "refunded"
}

/** Latest month that is fully covered by the data. */
export function latestFullMonth(payments: PaymentRow[]): string | null {
  const dates = payments.filter(isCaptured).map((p) => p.paid_at).sort()
  if (!dates.length) return null
  const key = monthKey(dates[dates.length - 1])
  // The current calendar month is still running, so it isn't a full month yet.
  const current = monthKey(new Date().toISOString())
  return key >= current ? addMonths(current, -1) : key
}

export function computeMetrics(payments: PaymentRow[]): Metrics {
  const captured = payments.filter(isCaptured)
  const latest = latestFullMonth(payments)
  const first = captured.length ? monthKey(captured.map((p) => p.paid_at).sort()[0]) : null

  const empty: Metrics = {
    mrr: 0,
    arr: 0,
    prev_mrr: 0,
    growth_pct: null,
    revenue_last_month: 0,
    revenue_6m: 0,
    revenue_total: 0,
    refund_pct: 0,
    top_customer_pct: 0,
    top_customer_revenue: 0,
    customers_6m: 0,
    recurring_share_pct: 0,
    unclear_pct: 0,
    latest_month: latest,
    first_month: first,
    payment_count: payments.length,
    monthly: [],
  }
  if (!latest || !first || first > latest) return empty

  const months = monthRange(first, latest)
  const byMonth = new Map<string, MonthRow>(
    months.map((m) => [
      m,
      { month: m, gross: 0, refunds: 0, net: 0, recurring: 0, one_time: 0, unclear: 0, mrr: 0, payments: 0 },
    ])
  )
  const yearlyByMonth = new Map<string, number>()

  for (const p of captured) {
    const m = byMonth.get(monthKey(p.paid_at))
    if (!m) continue // partial current month is excluded
    m.payments++
    const amt = Math.abs(p.amount_inr)
    if (p.label === "refund") {
      m.refunds += amt
      continue
    }
    m.gross += amt
    if (p.status === "refunded") {
      m.refunds += amt
      continue
    }
    if (p.label === "recurring") {
      if (p.interval === "yearly") {
        yearlyByMonth.set(m.month, (yearlyByMonth.get(m.month) ?? 0) + amt)
      } else {
        m.recurring += amt
      }
    } else if (p.label === "one_time") m.one_time += amt
    else m.unclear += amt
  }

  for (const m of byMonth.values()) {
    let yearlyShare = 0
    for (let i = 0; i < 12; i++) yearlyShare += (yearlyByMonth.get(addMonths(m.month, -i)) ?? 0) / 12
    m.recurring += yearlyByMonth.get(m.month) ?? 0 // cash collected this month
    m.mrr = r2(m.recurring - (yearlyByMonth.get(m.month) ?? 0) + yearlyShare)
    m.net = r2(m.gross - m.refunds)
    m.gross = r2(m.gross)
    m.refunds = r2(m.refunds)
    m.recurring = r2(m.recurring)
    m.one_time = r2(m.one_time)
    m.unclear = r2(m.unclear)
  }

  const monthly = months.map((k) => byMonth.get(k)!)

  const byDay = new Map<string, number>()
  for (const p of captured) {
    if (!byMonth.has(monthKey(p.paid_at))) continue
    const day = p.paid_at.slice(0, 10)
    const amt = Math.abs(p.amount_inr)
    const sign = p.label === "refund" ? -1 : 1
    let v = sign * amt
    if (p.status === "refunded" && p.label !== "refund") v = 0 // captured then refunded: nets to zero
    byDay.set(day, (byDay.get(day) ?? 0) + v)
  }
  const daily = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [d, r2(v)] as [string, number])
  const last6 = monthly.slice(-6)
  const last6Keys = new Set(last6.map((m) => m.month))
  const latestRow = monthly[monthly.length - 1]
  const prevRow = monthly.length > 1 ? monthly[monthly.length - 2] : null

  const gross6 = last6.reduce((s, m) => s + m.gross, 0)
  const refunds6 = last6.reduce((s, m) => s + m.refunds, 0)
  const net6 = last6.reduce((s, m) => s + m.net, 0)
  const recurring6 = last6.reduce((s, m) => s + m.recurring, 0)
  const unclear6 = last6.reduce((s, m) => s + m.unclear, 0)

  const perCustomer = new Map<string, number>()
  for (const p of captured) {
    if (!last6Keys.has(monthKey(p.paid_at))) continue
    if (p.label === "refund" || p.status === "refunded") continue
    const key = p.customer_key || `anon:${p.payment_id}`
    perCustomer.set(key, (perCustomer.get(key) ?? 0) + Math.abs(p.amount_inr))
  }
  const topRevenue = Math.max(0, ...perCustomer.values())
  const paidTotal = [...perCustomer.values()].reduce((s, v) => s + v, 0)

  const mrr = latestRow.mrr
  const prevMrr = prevRow?.mrr ?? 0

  return {
    mrr: r2(mrr),
    arr: r2(mrr * 12),
    prev_mrr: r2(prevMrr),
    growth_pct: prevRow && prevMrr > 0 ? r1(((mrr - prevMrr) / prevMrr) * 100) : null,
    revenue_last_month: r2(latestRow.net),
    revenue_6m: r2(net6),
    revenue_total: r2(monthly.reduce((s, m) => s + m.net, 0)),
    refund_pct: gross6 > 0 ? r1((refunds6 / gross6) * 100) : 0,
    top_customer_pct: paidTotal > 0 ? r1((topRevenue / paidTotal) * 100) : 0,
    top_customer_revenue: r2(topRevenue),
    customers_6m: [...perCustomer.keys()].filter((k) => !k.startsWith("anon:")).length,
    recurring_share_pct: net6 > 0 ? r1((Math.min(recurring6, net6) / net6) * 100) : 0,
    unclear_pct: gross6 > 0 ? r1((unclear6 / gross6) * 100) : 0,
    latest_month: latest,
    first_month: first,
    payment_count: payments.length,
    monthly,
    daily,
  }
}

export function computeFlags(m: Metrics): Flag[] {
  const flags: Flag[] = []
  if (m.top_customer_pct > THRESHOLDS.concentrationPct) {
    flags.push({
      type: "concentration",
      title: `${Math.round(m.top_customer_pct)}% of revenue is one customer`,
      detail: {
        top_customer_pct: m.top_customer_pct,
        top_customer_revenue: m.top_customer_revenue,
        revenue_6m: m.revenue_6m,
        threshold_pct: THRESHOLDS.concentrationPct,
      },
    })
  }
  const rows = m.monthly
  for (let i = 3; i < rows.length; i++) {
    const avg = (rows[i - 1].net + rows[i - 2].net + rows[i - 3].net) / 3
    if (avg > 0 && rows[i].net > THRESHOLDS.spikeMultiple * avg) {
      flags.push({
        type: "spike",
        title: `${monthLabel(rows[i].month)} revenue is ${r1(rows[i].net / avg)}x the 3-month average`,
        detail: {
          month: rows[i].month,
          month_revenue: rows[i].net,
          prev_3_month_avg: r2(avg),
          multiple: r1(rows[i].net / avg),
        },
      })
    }
  }
  if (m.refund_pct > THRESHOLDS.refundPct) {
    flags.push({
      type: "refunds",
      title: `Refunds are ${m.refund_pct}% of revenue`,
      detail: { refund_pct: m.refund_pct, threshold_pct: THRESHOLDS.refundPct },
    })
  }
  if (m.unclear_pct > THRESHOLDS.unclearPct) {
    flags.push({
      type: "unclear",
      title: `${m.unclear_pct}% of revenue couldn't be classified`,
      detail: { unclear_pct: m.unclear_pct },
    })
  }
  return flags
}

// ---- Leaderboard helpers ----

export type Range = "30d" | "6m" | "all"

function lastDayOf(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

function minusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Date window [from, to] (inclusive, YYYY-MM-DD) for a range, ending at the latest full month in the data. */
export function rangeWindow(m: Metrics, range: Range): { from: string; to: string } | null {
  if (!m.latest_month || !m.monthly.length) return null
  const to = lastDayOf(m.latest_month)
  if (range === "30d") return { from: minusDays(to, 29), to }
  const first = range === "6m" ? m.monthly.slice(-6)[0].month : m.monthly[0].month
  return { from: `${first}-01`, to }
}

export function revenueInRange(m: Metrics, range: Range): number {
  if (!m.monthly.length) return 0
  if (range === "30d") {
    const w = rangeWindow(m, range)
    // Older saved metrics have no daily rows: fall back to the latest full month.
    if (!m.daily || !w) return r2(m.monthly[m.monthly.length - 1].net)
    return r2(m.daily.filter(([d]) => d >= w.from && d <= w.to).reduce((s, [, v]) => s + v, 0))
  }
  const rows = range === "6m" ? m.monthly.slice(-6) : m.monthly
  return r2(rows.reduce((s, x) => s + x.net, 0))
}
