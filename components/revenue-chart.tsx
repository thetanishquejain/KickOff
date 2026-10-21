"use client"

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { inr, inrShort, monthLabel } from "@/lib/format"

type Row = { month: string; net: number; mrr: number }

export function RevenueChart({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }))
  if (!data.length) return null
  return (
    <div className="h-64 w-full" role="img" aria-label={`Monthly revenue and MRR from ${data[0].label} to ${data[data.length - 1].label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#33604A" />
          <XAxis dataKey="label" tick={{ fill: "#B3CBBE", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => inrShort(v)}
            tick={{ fill: "#B3CBBE", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#20442F", border: "1px solid #33604A", borderRadius: 8, color: "#fff" }}
            labelStyle={{ color: "#B3CBBE" }}
            formatter={(v: number, name: string) => [inr(v), name === "net" ? "Net revenue" : "MRR"]}
          />
          <Bar dataKey="net" fill="#4ADE80" fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line dataKey="mrr" stroke="#FF8A3D" strokeWidth={2} dot={{ r: 3, fill: "#FF8A3D" }} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-verified/40" /> Net revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-saffron" /> MRR
        </span>
      </div>
    </div>
  )
}
