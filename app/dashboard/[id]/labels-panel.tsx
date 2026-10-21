"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { inr } from "@/lib/format"
import type { Interval, Label } from "@/lib/metrics"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { computeListing, overrideLabel } from "../actions"

export type LabelGroup = {
  key: string
  example: string
  ids: string[]
  total: number
  label: string | null
  interval: string | null
  source: string | null
  reason: string | null
}

const OPTIONS: { value: string; label: string }[] = [
  { value: "recurring:monthly", label: "Recurring · monthly" },
  { value: "recurring:yearly", label: "Recurring · yearly" },
  { value: "one_time:", label: "One-time" },
  { value: "refund:", label: "Refund" },
  { value: "unclear:", label: "Unclear" },
]

const TONE: Record<string, string> = {
  recurring: "text-verified",
  one_time: "text-ink",
  refund: "text-danger",
  unclear: "text-warning",
}

export function LabelsPanel({ listingId, groups }: { listingId: string; groups: LabelGroup[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? groups : groups.slice(0, 12)

  function change(g: LabelGroup, value: string) {
    const [label, interval] = value.split(":") as [Label, string]
    start(async () => {
      const r = await overrideLabel(listingId, g.ids, label, (interval || null) as Interval)
      if (!r.ok) return void toast.error(r.error)
      const c = await computeListing(listingId, { explain: true })
      if (!c.ok) return void toast.error(c.error)
      toast.success("Label updated and numbers recalculated.")
      router.refresh()
    })
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface", pending && "opacity-70")}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 font-medium">Payment description</th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium sm:table-cell">Payments</th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">Total</th>
            <th scope="col" className="px-4 py-3 font-medium">Label</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((g) => (
            <tr key={g.key} className="border-b border-line last:border-0">
              <td className="max-w-0 px-4 py-3">
                <div className="truncate text-ink">{g.example}</div>
                <div className="truncate text-xs text-ink-muted">
                  {g.source === "ai" ? `AI: ${g.reason ?? ""}` : g.source === "founder" ? "Corrected by you" : "Keyword rules"}
                </div>
              </td>
              <td className="num hidden px-4 py-3 text-right sm:table-cell">{g.ids.length}</td>
              <td className="num hidden px-4 py-3 text-right md:table-cell">{inr(g.total)}</td>
              <td className="px-4 py-3">
                <label className="sr-only" htmlFor={`label-${g.key}`}>
                  Label for {g.example}
                </label>
                <select
                  id={`label-${g.key}`}
                  disabled={pending}
                  value={`${g.label}:${g.label === "recurring" ? g.interval ?? "monthly" : ""}`}
                  onChange={(e) => change(g, e.target.value)}
                  className={cn(
                    "h-9 w-full max-w-[12rem] rounded-md border border-line bg-surface px-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
                    TONE[g.label ?? "unclear"]
                  )}
                >
                  {OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="text-ink">
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {groups.length > 12 && (
        <div className="border-t border-line p-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show fewer" : `Show all ${groups.length} patterns`}
          </Button>
        </div>
      )}
    </div>
  )
}
