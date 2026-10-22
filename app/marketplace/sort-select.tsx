"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { MARKET_RANGES, MARKET_SORTS, marketHref, sortUsesRange, withChange, type MarketRange, type MarketSort, type MarketState } from "@/lib/market-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** Sort and reporting-range controls. Both write to the URL; range only shows for sorts that use it. */
export function MarketSortControls({ state }: { state: MarketState }) {
  const router = useRouter()
  const [, start] = useTransition()
  const go = (patch: Partial<MarketState>) => start(() => router.push(marketHref(withChange(state, patch)), { scroll: false }))
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={state.sort} onValueChange={(v) => go({ sort: v as MarketSort })}>
        <SelectTrigger className="h-9 w-48" aria-label="Sort startups">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-line bg-surface">
          {MARKET_SORTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {sortUsesRange(state.sort) && (
        <Select value={state.range} onValueChange={(v) => go({ range: v as MarketRange })}>
          <SelectTrigger className="h-9 w-36" aria-label="Reporting period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-line bg-surface">
            {MARKET_RANGES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
