import { AlertTriangle } from "lucide-react"
import Link from "next/link"

import { askingMultiple, rangeStats, type ListingFull } from "@/lib/data"
import { inr, inrShort, multiple } from "@/lib/format"
import type { Range } from "@/lib/metrics"
import { cn } from "@/lib/utils"

import { DemoTag, FlagIcon, Growth, InitialAvatar } from "./kit"
import { ForSaleTag } from "./listing-row"

export type SortKey = "mrr" | "revenue" | "growth" | "traffic" | "rpv"

export const SORTS: { value: SortKey; label: string; column: string }[] = [
  { value: "mrr", label: "MRR", column: "MRR" },
  { value: "revenue", label: "Revenue", column: "Revenue" },
  { value: "growth", label: "Growth", column: "MoM growth" },
  { value: "traffic", label: "Traffic", column: "Visitors" },
  { value: "rpv", label: "Revenue per visitor", column: "₹ / visitor" },
]

export const RANGES: { value: Range; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "all", label: "All time" },
]

export function parseSort(v?: string): SortKey {
  return (SORTS.find((s) => s.value === v)?.value ?? "mrr") as SortKey
}
export function parseRange(v?: string): Range {
  if (v === "month") return "30d" // old links
  return (RANGES.find((r) => r.value === v)?.value ?? "all") as Range
}

type Row = { l: ListingFull; value: number | null; display: string }

export function rankListings(listings: ListingFull[], sort: SortKey, range: Range): Row[] {
  const rows: Row[] = listings
    .filter((l) => l.metrics)
    .map((l) => {
      const m = l.metrics!
      const s = rangeStats(l, range)
      switch (sort) {
        case "revenue":
          return { l, value: s.revenue, display: inrShort(s.revenue) }
        case "growth":
          return { l, value: m.growth_pct, display: "" }
        case "traffic":
          return { l, value: s.visitors, display: s.visitors === null ? "–" : s.visitors.toLocaleString("en-IN") }
        case "rpv":
          return { l, value: s.perVisitor, display: s.perVisitor === null ? "–" : inr(s.perVisitor, { decimals: 2 }) }
        default:
          return { l, value: m.mrr, display: inrShort(m.mrr) }
      }
    })
  // Listings without data for this sort go last.
  return rows.sort((a, b) => {
    if (a.value === null && b.value === null) return (b.l.metrics?.mrr ?? 0) - (a.l.metrics?.mrr ?? 0)
    if (a.value === null) return 1
    if (b.value === null) return -1
    return b.value - a.value
  })
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) return <span className="num text-ink-muted">{rank}</span>
  const color = rank === 1 ? "bg-rank-gold" : rank === 2 ? "bg-rank-silver" : "bg-rank-bronze"
  return (
    <span className={cn("num inline-flex size-7 items-center justify-center rounded-full text-sm font-bold text-ink", color)} aria-label={`Rank ${rank}`}>
      {rank}
    </span>
  )
}

export function LeaderboardTable({
  listings,
  sort,
  range,
  limit,
  compact,
}: {
  listings: ListingFull[]
  sort: SortKey
  range: Range
  limit?: number
  compact?: boolean
}) {
  const rows = rankListings(listings, sort, range).slice(0, limit)
  const column = SORTS.find((s) => s.value === sort)!.column
  if (!rows.length) {
    return <p className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-ink-muted">No verified startups for this period yet.</p>
  }
  return (
    <>
      {/* Phones: ranked cards with the key numbers, not a squeezed table */}
      <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface sm:hidden">
        {rows.map((r, i) => (
          <li key={r.l.id}>
            <Link href={`/listing/${r.l.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-hover">
              <RankBadge rank={i + 1} />
              <InitialAvatar name={r.l.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{r.l.name}</span>
                <span className="block truncate text-caption text-ink-muted">
                  {r.l.founder_name ?? "Founder"} · {r.l.category}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="flex items-center justify-end gap-1">
                  <span className={cn("num text-sm font-semibold", r.value === null ? "text-ink-muted" : "text-ink")}>
                    {sort === "growth" ? <Growth value={r.l.metrics?.growth_pct} /> : r.display}
                  </span>
                  {r.l.flags.length > 0 && <AlertTriangle className="size-3.5 text-warning" aria-label={`Risk flag: ${r.l.flags.map((f) => f.title).join("; ")}`} />}
                </span>
                <span className="block text-caption text-ink-muted">
                  {sort === "growth" ? "MoM growth" : column}
                  {sort !== "growth" && (
                    <>
                      {" · "}
                      <Growth value={r.l.metrics?.growth_pct} className="text-caption" />
                    </>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface sm:block">
      <table className="w-full text-sm">
        <thead className="whitespace-nowrap bg-surface text-left text-xs text-ink-muted">
          <tr className="border-b border-line">
            <th scope="col" className="w-10 px-2 py-3 text-center font-medium sm:w-14 sm:px-4">#</th>
            <th scope="col" className="px-2 py-3 font-medium">Startup</th>
            <th scope="col" className="hidden px-2 py-3 font-medium md:table-cell">Founder</th>
            {sort !== "growth" && <th scope="col" className="px-4 py-3 text-right font-medium">{column}</th>}
            {!compact && <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">Asking</th>}
            {!compact && <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">Multiple</th>}
            <th scope="col" className={cn("px-4 py-3 text-right font-medium", sort !== "growth" && "hidden sm:table-cell")}>MoM growth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.l.id} className="h-[60px] border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-hover">
              <td className="px-2 text-center sm:px-4">
                <RankBadge rank={i + 1} />
              </td>
              <td className="w-full px-2">
                <Link href={`/listing/${r.l.id}`} className="flex min-w-[140px] items-center gap-3 rounded-md">
                  <InitialAvatar name={r.l.name} size={36} />
                  <span className="min-w-0 max-w-[8rem] sm:max-w-[22rem]">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink">{r.l.name}</span>
                      {r.l.asking_price_inr ? (
                        <span className="hidden sm:inline-flex">
                          <ForSaleTag />
                        </span>
                      ) : null}
                      {r.l.is_demo && (
                        <span className="hidden sm:inline-flex">
                          <DemoTag />
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">{r.l.pitch}</span>
                    <span className="block truncate text-xs text-ink-muted md:hidden">{r.l.founder_name}</span>
                  </span>
                </Link>
              </td>
              <td className="hidden whitespace-nowrap px-2 md:table-cell">
                <span className="flex items-center gap-2">
                  <InitialAvatar name={r.l.founder_name} size={28} className="rounded-full" />
                  <span className="truncate text-ink">{r.l.founder_name ?? "Founder"}</span>
                </span>
              </td>
              {sort !== "growth" && (
                <td className="px-3 text-right sm:px-4">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <span className={cn("num font-bold", r.value === null ? "text-ink-muted" : "text-ink")}>{r.display}</span>
                    <FlagIcon titles={r.l.flags.map((f) => f.title)} />
                  </span>
                </td>
              )}
              {!compact && <td className="num hidden px-4 text-right lg:table-cell">{inrShort(r.l.asking_price_inr)}</td>}
              {!compact && <td className="num hidden px-4 text-right lg:table-cell">{multiple(askingMultiple(r.l))}</td>}
              <td className={cn("px-4 text-right", sort !== "growth" && "hidden sm:table-cell")}>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Growth value={r.l.metrics?.growth_pct} />
                  {sort === "growth" && <FlagIcon titles={r.l.flags.map((f) => f.title)} />}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  )
}
