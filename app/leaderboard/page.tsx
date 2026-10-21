import Link from "next/link"

import { CATEGORIES, getPublishedListings } from "@/lib/data"
import { cn } from "@/lib/utils"
import { LeaderboardTable, parseRange, parseSort, RANGES, SORTS } from "@/components/leaderboard"
import { LeaderboardControls } from "@/components/leaderboard-controls"
import { PageHeader } from "@/components/page-header"

export const dynamic = "force-dynamic"
export const metadata = { title: "Leaderboard" }

type SP = { sort?: string; range?: string; category?: string; show?: string }

const PAGE_SIZE = 25

function hrefWith(sp: SP, patch: Partial<SP>) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v)
  const s = next.toString()
  return s ? `/leaderboard?${s}` : "/leaderboard"
}

export default async function LeaderboardPage({ searchParams: sp }: { searchParams: SP }) {
  const sort = parseSort(sp.sort)
  const range = parseRange(sp.range)
  const category = CATEGORIES.includes(sp.category ?? "") ? sp.category : undefined
  const all = await getPublishedListings()
  const listings = category ? all.filter((l) => l.category === category) : all
  const used = CATEGORIES.filter((c) => all.some((l) => l.category === c))
  const sortLabel = SORTS.find((s) => s.value === sort)!.label
  const rangeLabel = RANGES.find((r) => r.value === range)!.label
  const shown = Math.max(PAGE_SIZE, Number(sp.show) || PAGE_SIZE)
  const ranked = listings.filter((l) => l.metrics).length

  return (
    <div className="pb-8">
      <PageHeader title="Leaderboard" actions={<LeaderboardControls sorts={SORTS} ranges={RANGES} sort={sort} range={range} />}>
        Startups ranked by numbers calculated from payment data. Traffic comes from connected Google Analytics.
      </PageHeader>

      <nav aria-label="Leaderboard categories" className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {[undefined, ...used].map((c) => {
            const active = c === category
            return (
              <li key={c ?? "all"}>
                <Link
                  href={hrefWith(sp, { category: c, show: undefined })}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-block border-b-2 px-3 py-2 text-sm transition-colors duration-150",
                    active ? "border-brand font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
                  )}
                >
                  {c ?? "All"}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <p className="mb-3 text-caption text-ink-muted" aria-live="polite">
        {listings.length} {listings.length === 1 ? "startup" : "startups"} · sorted by {sortLabel.toLowerCase()} · {rangeLabel.toLowerCase()}
        {(sort === "traffic" || sort === "rpv") && " · startups without traffic data are listed last"}
      </p>

      <LeaderboardTable listings={listings} sort={sort} range={range} limit={shown} />

      {ranked > shown && (
        <div className="mt-4 flex justify-center">
          <Link
            href={hrefWith(sp, { show: String(shown + PAGE_SIZE) })}
            scroll={false}
            className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            Show more · {ranked - shown} more startups
          </Link>
        </div>
      )}

      {(sort === "mrr" || sort === "growth") && range !== "all" && (
        <p className="mt-3 text-caption text-ink-muted">MRR and MoM growth always use each startup&apos;s latest full month. The time range applies to revenue and traffic.</p>
      )}
    </div>
  )
}
