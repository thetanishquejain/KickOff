"use client"

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { inr, inrShort, monthLabel } from "@/lib/format"
import { THEME } from "@/lib/theme"

type Row = { month: string; net: number; mrr: number }

export function RevenueChart({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }))
  if (!data.length) return null
  return (
    <div className="h-64 w-full" role="img" aria-label={`Monthly revenue and MRR from ${data[0].label} to ${data[data.length - 1].label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={THEME.border} />
          <XAxis dataKey="label" tick={{ fill: THEME.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => inrShort(v)}
            tick={{ fill: THEME.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,28,25,0.04)" }}
            contentStyle={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 8, color: THEME.foreground }}
            labelStyle={{ color: THEME.muted }}
            formatter={(v: number, name: string) => [inr(v), name === "net" ? "Net revenue" : "MRR"]}
          />
          <Bar isAnimationActive={false} dataKey="net" fill={THEME.success} fillOpacity={0.22} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line isAnimationActive={false} dataKey="mrr" stroke={THEME.primary} strokeWidth={2} dot={{ r: 3, fill: THEME.primary }} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-verified/30" /> Net revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-brand" /> MRR
        </span>
      </div>
    </div>
  )
}
