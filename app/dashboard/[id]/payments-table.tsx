"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { inr } from "@/lib/format"
import type { Interval, Label } from "@/lib/metrics"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { computeListing, overrideLabel } from "../actions"

export type PaymentRowView = {
  id: string
  paid_at: string
  description: string
  amount_inr: number
  status: string
  label: string | null
  interval: string | null
  source: string | null
  reason: string | null
}

const LABEL_OPTIONS = [
  { value: "recurring:monthly", label: "Recurring · monthly" },
  { value: "recurring:yearly", label: "Recurring · yearly" },
  { value: "one_time:", label: "One-time" },
  { value: "refund:", label: "Refund" },
  { value: "unclear:", label: "Unclear" },
]

const FILTERS = [
  { value: "all", label: "All" },
  { value: "recurring", label: "Recurring" },
  { value: "one_time", label: "One-time" },
  { value: "refund", label: "Refund" },
  { value: "unclear", label: "Unclear" },
  { value: "founder", label: "Corrected by you" },
]

const PAGE = 25

const STATUS_TONE: Record<string, string> = {
  captured: "text-verified",
  refunded: "text-warning",
}

export function PaymentsTable({ listingId, rows }: { listingId: string; rows: PaymentRowView[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [filter, setFilter] = useState("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows
      .filter((r) => (filter === "all" ? true : filter === "founder" ? r.source === "founder" : r.label === filter))
      .filter((r) => !needle || r.description.toLowerCase().includes(needle))
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
  }, [rows, filter, q])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const visible = filtered.slice(page * PAGE, page * PAGE + PAGE)

  function change(r: PaymentRowView, value: string) {
    const [label, interval] = value.split(":") as [Label, string]
    start(async () => {
      const o = await overrideLabel(listingId, [r.id], label, (interval || null) as Interval)
      if (!o.ok) return void toast.error(o.error)
      const c = await computeListing(listingId, { explain: true })
      if (!c.ok) return void toast.error(c.error)
      toast.success("Saved. Metrics recalculated.")
      router.refresh()
    })
  }

  return (
    <div className={cn("rounded-lg border border-line bg-surface", pending && "opacity-70")} aria-busy={pending}>
      <div className="flex flex-col gap-3 border-b border-line p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter payments by label">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => {
                setFilter(f.value)
                setPage(0)
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-caption transition-colors duration-150",
                filter === f.value ? "border-brand bg-brand/10 text-brand" : "border-line text-ink-muted hover:text-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="pay-search">
          Search payment descriptions
        </label>
        <input
          id="pay-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
          placeholder="Search descriptions"
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand md:w-56"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-table">
          <thead className="whitespace-nowrap text-left text-caption text-ink-muted">
            <tr className="border-b border-line">
              <th scope="col" className="px-3 py-2 font-medium">Date</th>
              <th scope="col" className="px-3 py-2 font-medium">Description</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">Suggested by</th>
              <th scope="col" className="px-3 py-2 font-medium">Label</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="num whitespace-nowrap px-3 py-2 text-ink-muted">
                  {new Date(r.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                </td>
                <td className="max-w-[16rem] truncate px-3 py-2" title={r.description}>
                  {r.description || <span className="text-ink-muted">(no description)</span>}
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right">{inr(r.amount_inr)}</td>
                <td className={cn("whitespace-nowrap px-3 py-2 capitalize", STATUS_TONE[r.status] ?? "text-ink-muted")}>{r.status}</td>
                <td className="whitespace-nowrap px-3 py-2 text-caption text-ink-muted" title={r.reason ?? undefined}>
                  {r.source === "ai" ? "AI" : r.source === "founder" ? "You (override)" : r.source === "rules" ? "Keyword rules" : "–"}
                </td>
                <td className="px-3 py-2">
                  <label className="sr-only" htmlFor={`pl-${r.id}`}>
                    Label for payment {r.description}
                  </label>
                  <select
                    id={`pl-${r.id}`}
                    disabled={pending || r.status === "failed"}
                    value={`${r.label ?? "unclear"}:${r.label === "recurring" ? r.interval ?? "monthly" : ""}`}
                    onChange={(e) => change(r, e.target.value)}
                    className="h-8 rounded-md border border-line bg-surface px-2 text-caption focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-40"
                  >
                    {LABEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-muted">
                  No payments match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line p-3 text-caption text-ink-muted">
        <span>
          {filtered.length.toLocaleString("en-IN")} payments{filtered.length !== rows.length ? ` of ${rows.length.toLocaleString("en-IN")}` : ""} · failed payments never count as revenue
        </span>
        <span className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="num">
            {page + 1} / {pages}
          </span>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </span>
      </div>
    </div>
  )
}
