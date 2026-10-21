"use client"

import { useMemo, useState } from "react"
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { inr, inrShort, monthLabel, pct } from "@/lib/format"
import type { Metrics } from "@/lib/metrics"
import { useThemeColors } from "@/lib/use-theme-colors"
import { cn } from "@/lib/utils"

type View = "revenue" | "mrr"
type Span = "30d" | "90d" | "6m" | "all"

const SPANS: { value: Span; label: string; days?: number; months?: number }[] = [
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "6m", label: "Last 6 months", months: 6 },
  { value: "all", label: "All time" },
]

const day = (d: Date) => d.toISOString().slice(0, 10)
function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return day(d)
}
const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })

/**
 * Revenue explorer: daily net revenue (or monthly MRR) for a chosen window, with the previous
 * window of the same length drawn dashed behind it. Every value comes from the computed metrics;
 * nothing is interpolated or estimated.
 */
export function RevenueExplorer({ m }: { m: Metrics }) {
  const [view, setView] = useState<View>("revenue")
  const [span, setSpan] = useState<Span>("30d")
  const hasDaily = Boolean(m.daily?.length)
  const c = useThemeColors()

  const data = useMemo(() => {
    if (!m.latest_month || !m.first_month) return null
    if (view === "mrr" || !hasDaily) {
      const months = m.monthly
      const n = span === "30d" ? 1 : span === "90d" ? 3 : span === "6m" ? 6 : months.length
      const cur = months.slice(-n)
      const prev = months.slice(-2 * n, -n)
      const key = view === "mrr" ? "mrr" : "net"
      const rows = cur.map((r, i) => ({ label: monthLabel(r.month), value: r[key], prev: prev.length === cur.length ? prev[i][key] : null }))
      const total = view === "mrr" ? cur[cur.length - 1]?.mrr ?? 0 : cur.reduce((s, r) => s + r.net, 0)
      const prevTotal = prev.length === cur.length ? (view === "mrr" ? prev[prev.length - 1]?.mrr ?? 0 : prev.reduce((s, r) => s + r.net, 0)) : null
      return { rows, total, prevTotal, daily: false }
    }
    // Daily series: zero-filled from the first day of data to the end of the latest full month.
    const [y, mo] = m.latest_month.split("-").map(Number)
    const end = day(new Date(Date.UTC(y, mo, 0)))
    const start = `${m.first_month}-01`
    const byDay = new Map(m.daily!.map(([d, v]) => [d, v]))
    const all: { d: string; v: number }[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) all.push({ d, v: byDay.get(d) ?? 0 })
    const spec = SPANS.find((s) => s.value === span)!
    let len = all.length
    if (spec.days) len = Math.min(spec.days, all.length)
    if (spec.months) {
      const firstOfWindow = `${m.monthly.slice(-spec.months)[0].month}-01`
      len = all.length - all.findIndex((r) => r.d >= firstOfWindow)
    }
    const cur = all.slice(-len)
    const prevSlice = all.slice(Math.max(0, all.length - 2 * len), all.length - len)
    const prevFull = prevSlice.length === len
    const rows = cur.map((r, i) => ({ label: shortDate(r.d), value: r.v, prev: prevFull ? prevSlice[i].v : null }))
    const total = cur.reduce((s, r) => s + r.v, 0)
    const prevTotal = prevFull ? prevSlice.reduce((s, r) => s + r.v, 0) : null
    return { rows, total, prevTotal, daily: true }
  }, [m, view, span, hasDaily])

  if (!data || !data.rows.length) {
    return <p className="rounded-lg border border-dashed border-line p-6 text-sm text-ink-muted">Not enough payment history to draw a chart yet.</p>
  }

  const change = data.prevTotal ? Math.round(((data.total - data.prevTotal) / data.prevTotal) * 1000) / 10 : null
  const spanLabel = SPANS.find((s) => s.value === span)!.label.toLowerCase()

  return (
    <section aria-labelledby="explorer-h" className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="explorer-h" className="text-caption text-ink-muted">
            {view === "mrr" ? "MRR at end of period" : `Net revenue, ${spanLabel}`}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="num text-2xl font-semibold">{inr(data.total)}</span>
            {change !== null ? (
              <span className={cn("num text-sm font-medium", change >= 0 ? "text-verified" : "text-danger")}>
                {change >= 0 ? "↑" : "↓"} {pct(Math.abs(change))} <span className="font-normal text-ink-muted">vs previous {view === "mrr" && data.rows.length === 1 ? "month" : "period"}</span>
              </span>
            ) : (
              <span className="text-caption text-ink-muted">No earlier period to compare</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Metric"
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { value: "revenue", label: "Revenue" },
              { value: "mrr", label: "MRR" },
            ]}
          />
          <label className="sr-only" htmlFor="explorer-span">
            Time range
          </label>
          <select
            id="explorer-span"
            value={span}
            onChange={(e) => setSpan(e.target.value as Span)}
            className="h-8 rounded-md border border-line bg-surface px-2 text-label text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {SPANS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="mt-4 h-64 w-full"
        role="img"
        aria-label={`${view === "mrr" ? "MRR" : "Net revenue"} ${spanLabel}: ${inr(data.total)}${change !== null ? `, ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on the previous period` : ""}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="kx-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.border} />
            <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={(v) => inrShort(v)} tick={{ fill: c.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              cursor={{ stroke: c.border }}
              contentStyle={{ background: c.surface, border: "1px solid rgb(var(--border))", borderRadius: 8, color: c.foreground, fontSize: 12 }}
              labelStyle={{ color: c.muted }}
              formatter={(v: number, name: string) => [inr(v), name === "prev" ? "Previous period" : view === "mrr" ? "MRR" : "Net revenue"]}
            />
            <Line dataKey="prev" stroke={c.muted} strokeDasharray="4 4" strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
            <Area dataKey="value" type={data.daily ? "linear" : "monotone"} stroke={c.primary} strokeWidth={2} fill="url(#kx-fill)" dot={data.rows.length <= 12 ? { r: 3, fill: c.primary } : false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-caption text-ink-muted">
        <span className="flex gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-brand" /> {view === "mrr" ? "MRR" : data.daily ? "Daily net revenue" : "Monthly net revenue"}
          </span>
          {data.prevTotal !== null && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-ink-muted" /> Previous period
            </span>
          )}
        </span>
        <span>Full months only · refunds subtracted</span>
      </div>
    </section>
  )
}

function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-8 rounded-md border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded px-2.5 text-label transition-colors duration-150", value === o.value ? "bg-surface-hover font-medium text-ink" : "text-ink-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
