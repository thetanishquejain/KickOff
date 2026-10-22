// Builds AnalyticsBento props for one startup's page. Code does all the maths; nothing is invented.
import type { AnalyticsBentoProps } from "@/components/ui/analytics-bento"
import type { ListingFull } from "@/lib/data"
import { addMonths, type MonthRow } from "@/lib/metrics"
import { inr, inrShort, monthLabel, pct } from "@/lib/format"

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const pctDelta = (now: number, before: number) => {
  if (!before) return ""
  const p = ((now - before) / before) * 100
  return `${p < 0 ? "-" : ""}${Math.abs(Number(p.toFixed(1)))}%`
}
const shortMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number)
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en-IN", { month: "short", timeZone: "UTC" }) + ` '${String(y).slice(2)}`
}
function shiftDay(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Revenue types, in the order the treemap legend shows them
const TYPES = [
  { id: "recurring", name: "Recurring", color: "#34D399" },
  { id: "one_time", name: "One-time", color: "#7DD3FC" },
  { id: "unclear", name: "Unclear", color: "#CBD5E1" },
] as const

export type BentoData = Omit<AnalyticsBentoProps, keyof JSX.IntrinsicElements["div"]>

export function buildListingBento(l: ListingFull): BentoData | null {
  const m = l.metrics
  if (!m || !m.monthly.length) return null

  // continuous month list (gaps filled with zero months)
  const rows = new Map(m.monthly.map((r) => [r.month, r]))
  const months: string[] = []
  for (let k = m.monthly[0].month; k <= m.monthly[m.monthly.length - 1].month; k = addMonths(k, 1)) months.push(k)
  const row = (k: string): MonthRow =>
    rows.get(k) ?? { month: k, gross: 0, refunds: 0, net: 0, recurring: 0, one_time: 0, unclear: 0, mrr: 0, payments: 0 }
  const latest = months[months.length - 1]

  // ---- A: MRR + net revenue line ----
  const revenue: BentoData["revenue"] = {
    label: "MRR",
    value: Math.round(m.mrr),
    delta: pctDelta(m.mrr, m.prev_mrr),
    note: `ARR ${inrShort(m.arr)} · vs ${inrShort(m.prev_mrr)} the month before`,
    caption: "Net revenue by month",
    series: months.map((k) => ({ label: monthLabel(k), value: Math.round(row(k).net) })),
  }

  // ---- B: traffic waves, three 30-day windows ending at the latest synced day ----
  let sessions: BentoData["sessions"]
  if (l.traffic.length) {
    const users = new Map(l.traffic.map((t) => [t.date, t.active_users]))
    const sess = new Map(l.traffic.map((t) => [t.date, t.sessions]))
    const last = l.traffic.reduce((a, t) => (t.date > a ? t.date : a), l.traffic[0].date)
    const windows = [0, 1, 2]
      .map((k) => Array.from({ length: 30 }, (_, i) => shiftDay(last, -(30 * (k + 1)) + 1 + i)))
      .filter((w, k) => k === 0 || w.some((d) => users.has(d)))
    const visitors = windows.map((w) => w.map((d) => users.get(d) ?? 0))
    const sessionRows = windows.map((w) => w.map((d) => sess.get(d) ?? 0))
    const now = sum(visitors[0])
    const demo = l.traffic.some((t) => t.is_demo)
    sessions = {
      label: "Visitors, last 30 days",
      value: now,
      delta: visitors[1] ? pctDelta(now, sum(visitors[1])) : "",
      note: `${sum(sessionRows[0]).toLocaleString("en-IN")} sessions · ${demo ? "demo data" : "Google Analytics"}`,
      desktop: visitors,
      mobile: sessionRows,
      labels: { desktop: "Visitors", mobile: "Sessions", prior: "Earlier 30-day periods", current: "last 30 days" },
      xLabels: windows[0].map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })),
    }
  } else {
    sessions = {
      label: "Visitors",
      value: 0,
      delta: "",
      note: "Google Analytics not connected",
      desktop: [new Array(30).fill(0)],
      mobile: [new Array(30).fill(0)],
      labels: { desktop: "Visitors", mobile: "Sessions", prior: "Earlier", current: "last 30 days" },
    }
  }

  // ---- C: revenue mix treemap, one tile per month x payment type ----
  const six = months.slice(-6)
  const items = months.flatMap((k) =>
    TYPES.map((t) => {
      const v = Math.max(0, Math.round(row(k)[t.id]))
      return { name: `${shortMonth(k)} · ${t.name}`, group: t.id, values: [k === latest ? v : 0, six.includes(k) ? v : 0, v] }
    })
  ).filter((x) => x.values[2] > 0)
  const gross = (ks: string[]) => sum(ks.map((k) => row(k).recurring + row(k).one_time + row(k).unclear))
  const refunds = (ks: string[]) => sum(ks.map((k) => row(k).refunds))
  const prev6 = Array.from({ length: 6 }, (_, i) => addMonths(latest, -11 + i))
  const categories: BentoData["categories"] = {
    title: "Revenue mix",
    groups: TYPES.map((t) => ({ id: t.id, name: t.name, color: t.color, ink: "dark" as const })),
    periods: [
      { label: monthLabel(latest), total: Math.round(gross([latest])), delta: pctDelta(gross([latest]), gross([addMonths(latest, -1)])), compare: `${inrShort(refunds([latest]))} refunded` },
      { label: "6 months", total: Math.round(gross(six)), delta: pctDelta(gross(six), gross(prev6)), compare: `${inrShort(refunds(six))} refunded` },
      { label: "All time", total: Math.round(gross(months)), delta: "", compare: `Since ${monthLabel(months[0])}` },
    ],
    items,
    table: {
      columns: ["Month", "Recurring", "One-time", "Net"],
      rows: [...months].reverse().slice(0, 4).map((k) => ({ label: monthLabel(k), values: [inrShort(row(k).recurring), inrShort(row(k).one_time), inrShort(row(k).net)] })),
    },
  }

  // ---- D: seasonality radar, net revenue per calendar month for each year ----
  const years = Array.from(new Set(months.map((k) => k.slice(0, 4)))).sort().reverse().slice(0, 3)
  const yearMonths = (y: string) => months.filter((k) => k.startsWith(y))
  const yearNet = (y: string) => sum(yearMonths(y).map((k) => row(k).net))
  const seasonality: BentoData["seasonality"] = {
    title: "Revenue by month",
    years: years.map((y) => {
      const ks = yearMonths(y)
      const total = yearNet(y)
      const prev = String(Number(y) - 1)
      const avg = ks.length ? total / ks.length : 0
      const prevAvg = yearMonths(prev).length ? yearNet(prev) / yearMonths(prev).length : 0
      const best = ks.reduce((a, k) => (row(k).net > row(a).net ? k : a), ks[0])
      const g = gross(ks)
      return {
        label: y,
        values: Array.from({ length: 12 }, (_, i) => Math.round(row(`${y}-${String(i + 1).padStart(2, "0")}`).net)),
        stats: [
          { label: "Monthly avg", value: Math.round(avg), delta: pctDelta(avg, prevAvg), note: `${ks.length} months of data` },
          { label: "Year total", value: Math.round(total), delta: pctDelta(total, yearNet(prev)), note: `${sum(ks.map((k) => row(k).payments)).toLocaleString("en-IN")} payments` },
        ],
        rows: [
          { label: "Best month", value: `${monthLabel(best)} · ${inr(row(best).net)}` },
          { label: "Recurring share", value: g ? pct((sum(ks.map((k) => row(k).recurring)) / g) * 100) : "–" },
          { label: "Refunds", value: inr(refunds(ks)) },
        ],
      }
    }),
  }

  return { currency: "₹", revenue, sessions, categories, seasonality }
}
