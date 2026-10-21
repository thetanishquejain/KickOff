import { getPublishedListings } from "@/lib/data"
import { LeaderboardTable, parseRange, parseSort, RANGES, SORTS } from "@/components/leaderboard"
import { LeaderboardControls } from "@/components/leaderboard-controls"

export const dynamic = "force-dynamic"
export const metadata = { title: "Leaderboard" }

export default async function LeaderboardPage({ searchParams }: { searchParams: { sort?: string; range?: string } }) {
  const sort = parseSort(searchParams.sort)
  const range = parseRange(searchParams.range)
  const listings = await getPublishedListings()
  return (
    <div className="pt-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ranked by numbers verified from payment data. Traffic comes from connected Google Analytics.
          </p>
        </div>
        <LeaderboardControls sorts={SORTS} ranges={RANGES} sort={sort} range={range} />
      </div>
      <LeaderboardTable listings={listings} sort={sort} range={range} />
      {(sort === "mrr" || sort === "growth") && range !== "all" && (
        <p className="mt-3 text-xs text-ink-muted">MRR and MoM growth always use each startup's latest full month.</p>
      )}
    </div>
  )
}
