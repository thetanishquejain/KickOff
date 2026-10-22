// Builds AnalyticsBento props from verified listings. Code does all the maths; nothing is invented.
import type { AnalyticsBentoProps } from "@/components/ui/analytics-bento"
import type { ListingFull } from "@/lib/data"
import { addMonths } from "@/lib/metrics"
import { inr, inrShort, monthLabel } from "@/lib/format"

// Category fills: calm greens/blues that sit with the emerald brand; dark ink reads on all of them.
const GROUP_COLORS = ["#34D399", "#7DD3FC", "#A3E635", "#5EEAD4", "#C4B5FD", "#CBD5E1", "#86EFAC", "#BAE6FD", "#A5B4FC", "#F0ABFC", "#BEF264", "#99F6E4"]

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const pctDelta = (now: number, before: number) => {
  if (!before) return ""
  const p = ((now - before) / before) * 100
  return `${p < 0 ? "-" : ""}${Math.abs(Number(p.toFixed(1)))}%`
}

function shiftDay(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export type BentoData = Omit<AnalyticsBentoProps, keyof JSX.IntrinsicElements["div"]> & { demoTraffic: boolean }

export function buildBento(all: ListingFull[]): BentoData | null {
  const verified = all.filter((l) => l.metrics && l.metrics.monthly.length)
  if (!verified.length) return null

  // ---- combined net revenue per month (union of months) ----
  const byMonth = new Map<string, number>()
  for (const l of verified) for (const r of l.metrics!.monthly) byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.net)
  const months = Array.from(byMonth.keys()).sort()
  // fill gaps so the line is continuous
  const full: string[] = []
  for (let m = months[0]; m <= months[months.length - 1]; m = addMonths(m, 1)) full.push(m)
  const series = full.map((m) => ({ label: monthLabel(m), value: Math.round(byMonth.get(m) ?? 0) }))

  const mrr = sum(verified.map((l) => l.metrics!.mrr))
  const prevMrr = sum(verified.map((l) => l.metrics!.prev_mrr))

  // ---- traffic: three 30-day windows ending at the latest synced day ----
  const traffic = verified.flatMap((l) => l.traffic)
  let sessions: BentoData["sessions"] | null = null
  if (traffic.length) {
    const users = new Map<string, number>()
    const sess = new Map<string, number>()
    for (const t of traffic) {
      users.set(t.date, (users.get(t.date) ?? 0) + t.active_users)
      sess.set(t.date, (sess.get(t.date) ?? 0) + t.sessions)
    }
    const last = traffic.reduce((m, t) => (t.date > m ? t.date : m), traffic[0].date)
    const win = (k: number) => Array.from({ length: 30 }, (_, i) => shiftDay(last, -(30 * (k + 1)) + 1 + i))
    const windows = [0, 1, 2].map(win).filter((w, k) => k === 0 || w.some((d) => users.has(d)))
    const visitors = windows.map((w) => w.map((d) => users.get(d) ?? 0))
    const sessionRows = windows.map((w) => w.map((d) => sess.get(d) ?? 0))
    const now = sum(visitors[0])
    sessions = {
      label: "Visitors, last 30 days",
      value: now,
      delta: visitors[1] ? pctDelta(now, sum(visitors[1])) : "",
      note: `${sum(sessionRows[0]).toLocaleString("en-IN")} sessions · from Google Analytics`,
      desktop: visitors,
      mobile: sessionRows,
      labels: { desktop: "Visitors", mobile: "Sessions", prior: "Earlier 30-day periods", current: "last 30 days" },
      xLabels: windows[0].map((d) =>
        new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
      ),
    }
  }

  // ---- revenue by category: last month / 6 months / all time ----
  const latest = verified.reduce((m, l) => (l.metrics!.latest_month! > m ? l.metrics!.latest_month! : m), "")
  const inMonths = (l: ListingFull, from: string, to: string) =>
    sum(l.metrics!.monthly.filter((r) => r.month >= from && r.month <= to).map((r) => r.net))
  const winLast = [latest, latest] as const
  const win6 = [addMonths(latest, -5), latest] as const
  const prevLast = [addMonths(latest, -1), addMonths(latest, -1)] as const
  const prev6 = [addMonths(latest, -11), addMonths(latest, -6)] as const

  const cats = Array.from(new Set(verified.map((l) => l.category || "Other")))
  const groups = cats.map((c, i) => ({ id: c, name: c, color: GROUP_COLORS[i % GROUP_COLORS.length], ink: "dark" as const }))
  const items = verified.map((l) => ({
    name: l.name,
    group: l.category || "Other",
    values: [inMonths(l, ...winLast), inMonths(l, ...win6), sum(l.metrics!.monthly.map((r) => r.net))].map((v) => Math.max(0, Math.round(v))),
  }))
  const tot = (i: number) => sum(items.map((x) => x.values[i]))
  const totPrevLast = sum(verified.map((l) => inMonths(l, ...prevLast)))
  const totPrev6 = sum(verified.map((l) => inMonths(l, ...prev6)))
  const catTotals = cats
    .map((c) => ({ c, v: [0, 1, 2].map((i) => sum(items.filter((x) => x.group === c).map((x) => x.values[i]))) }))
    .sort((a, b) => b.v[2] - a.v[2])

  // ---- seasonality: combined revenue per calendar month, per year ----
  const years = Array.from(new Set(full.map((m) => m.slice(0, 4)))).sort().reverse().slice(0, 3)
  const yearTotal = (y: string) => sum(full.filter((m) => m.startsWith(y)).map((m) => byMonth.get(m) ?? 0))
  const seasonYears = years.map((y) => {
    const values = Array.from({ length: 12 }, (_, i) => Math.round(byMonth.get(`${y}-${String(i + 1).padStart(2, "0")}`) ?? 0))
    const active = full.filter((m) => m.startsWith(y) && (byMonth.get(m) ?? 0) !== 0)
    const total = yearTotal(y)
    const prevY = String(Number(y) - 1)
    const prevActive = full.filter((m) => m.startsWith(prevY) && (byMonth.get(m) ?? 0) !== 0)
    const avg = active.length ? total / active.length : 0
    const prevAvg = prevActive.length ? yearTotal(prevY) / prevActive.length : 0
    const earners = verified
      .map((l) => ({ name: l.name, v: sum(l.metrics!.monthly.filter((r) => r.month.startsWith(y)).map((r) => r.net)) }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v)
    const top = earners.slice(0, 3)
    return {
      label: y,
      values,
      stats: [
        { label: "Monthly avg", value: Math.round(avg), delta: pctDelta(avg, prevAvg), note: `${active.length} months of data` },
        { label: "Year total", value: Math.round(total), delta: pctDelta(total, yearTotal(prevY)), note: `${earners.length} startups` },
      ],
      rows: top.map((t) => ({ label: t.name, value: inr(t.v) })),
    }
  })

  return {
    currency: "₹",
    demoTraffic: traffic.some((t) => t.is_demo),
    revenue: {
      label: "Combined MRR",
      value: Math.round(mrr),
      delta: pctDelta(mrr, prevMrr),
      note: `Across ${verified.length} verified startups`,
      caption: "Net revenue by month",
      series,
    },
    sessions: sessions ?? {
      label: "Visitors",
      value: 0,
      delta: "",
      note: "Traffic not connected",
      desktop: [new Array(30).fill(0)],
      mobile: [new Array(30).fill(0)],
      labels: { desktop: "Visitors", mobile: "Sessions", prior: "Earlier", current: "last 30 days" },
    },
    categories: {
      title: "Revenue by category",
      groups,
      periods: [
        { label: monthLabel(latest), total: tot(0), delta: pctDelta(tot(0), totPrevLast), compare: `vs ${inrShort(totPrevLast)} the month before` },
        { label: "6 months", total: tot(1), delta: pctDelta(tot(1), totPrev6), compare: totPrev6 ? `vs ${inrShort(totPrev6)} the 6 before` : "First 6 months of data" },
        { label: "All time", total: tot(2), delta: "", compare: `Since ${monthLabel(full[0])}` },
      ],
      items,
      table: {
        columns: ["Category", monthLabel(latest), "6 months", "All time"],
        rows: catTotals.slice(0, 4).map((x) => ({ label: x.c, values: x.v.map((v) => inrShort(v)) })),
      },
    },
    seasonality: { title: "Revenue by month", years: seasonYears },
  }
}
