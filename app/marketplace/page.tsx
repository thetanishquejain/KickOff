import Link from "next/link"

import { CATEGORIES, getPublishedListings } from "@/lib/data"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/kit"
import { ListingCard } from "@/components/listing-card"

export const dynamic = "force-dynamic"
export const metadata = { title: "Marketplace" }

export default async function MarketplacePage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const all = await getPublishedListings()
  const q = (searchParams.q ?? "").trim().toLowerCase()
  const listings = all
    .filter((l) => !searchParams.category || l.category === searchParams.category)
    .filter((l) => !q || `${l.name} ${l.pitch} ${l.category}`.toLowerCase().includes(q))
    .sort((a, b) => (b.metrics?.mrr ?? 0) - (a.metrics?.mrr ?? 0))
  const used = CATEGORIES.filter((c) => all.some((l) => l.category === c))

  return (
    <div className="pt-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace</h1>
          <p className="mt-1 text-sm text-ink-muted">Startups for sale with revenue verified from payment data.</p>
        </div>
        <form className="w-full md:w-72" role="search">
          {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
          <label htmlFor="q" className="sr-only">
            Search startups
          </label>
          <input
            id="q"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search startups…"
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
          />
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter by category">
        <Chip href="/marketplace" active={!searchParams.category}>
          All
        </Chip>
        {used.map((c) => (
          <Chip key={c} href={`/marketplace?category=${encodeURIComponent(c)}`} active={searchParams.category === c}>
            {c}
          </Chip>
        ))}
      </div>

      {listings.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} l={l} />
          ))}
        </div>
      ) : (
        <EmptyState title="No verified startups here yet.">
          <Link href="/login?mode=signup&role=founder" className="text-sm text-saffron hover:underline">
            List your startup
          </Link>
        </EmptyState>
      )}
    </div>
  )
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors duration-150",
        active ? "border-saffron bg-saffron/10 text-saffron" : "border-line text-ink-muted hover:bg-surface-hover hover:text-ink"
      )}
    >
      {children}
    </Link>
  )
}
