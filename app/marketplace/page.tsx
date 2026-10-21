import Link from "next/link"
import { X } from "lucide-react"

import { askingMultiple, CATEGORIES, getPublishedListings, type ListingFull } from "@/lib/data"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/kit"
import { ListingCard } from "@/components/listing-card"
import { PageHeader } from "@/components/page-header"

import { SortSelect } from "./sort-select"

export const dynamic = "force-dynamic"
export const metadata = { title: "Marketplace" }

const PAGE_SIZE = 12

const MARKET_SORTS = [
  { value: "mrr", label: "Highest MRR" },
  { value: "growth", label: "Fastest growth" },
  { value: "multiple", label: "Lowest multiple" },
  { value: "price", label: "Lowest asking price" },
  { value: "new", label: "Newest" },
] as const

type Sort = (typeof MARKET_SORTS)[number]["value"]

function sortListings(ls: ListingFull[], sort: Sort) {
  const last = Number.POSITIVE_INFINITY
  const by: Record<Sort, (a: ListingFull, b: ListingFull) => number> = {
    mrr: (a, b) => (b.metrics?.mrr ?? -1) - (a.metrics?.mrr ?? -1),
    growth: (a, b) => (b.metrics?.growth_pct ?? -last) - (a.metrics?.growth_pct ?? -last),
    multiple: (a, b) => (askingMultiple(a) ?? last) - (askingMultiple(b) ?? last),
    price: (a, b) => (a.asking_price_inr ?? last) - (b.asking_price_inr ?? last),
    new: (a, b) => b.created_at.localeCompare(a.created_at),
  }
  return [...ls].sort(by[sort])
}

type SP = { category?: string; q?: string; sort?: string; show?: string }

function hrefWith(sp: SP, patch: Partial<SP>) {
  const next = new URLSearchParams()
  const merged = { ...sp, ...patch }
  for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
  const s = next.toString()
  return s ? `/marketplace?${s}` : "/marketplace"
}

export default async function MarketplacePage({ searchParams }: { searchParams: SP }) {
  const all = await getPublishedListings()
  const q = (searchParams.q ?? "").trim()
  const sort = (MARKET_SORTS.find((s) => s.value === searchParams.sort)?.value ?? "mrr") as Sort
  const category = CATEGORIES.includes(searchParams.category ?? "") ? searchParams.category : undefined
  const filtered = sortListings(
    all
      .filter((l) => !category || l.category === category)
      .filter((l) => !q || `${l.name} ${l.pitch} ${l.category}`.toLowerCase().includes(q.toLowerCase())),
    sort
  )
  const shown = Math.max(PAGE_SIZE, Number(searchParams.show) || PAGE_SIZE)
  const visible = filtered.slice(0, shown)
  const used = CATEGORIES.filter((c) => all.some((l) => l.category === c))
  const hasFilters = Boolean(category || q)

  return (
    <div>
      <PageHeader title="Marketplace">Startups for sale. Revenue figures are calculated from each founder&apos;s Razorpay payment data.</PageHeader>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 md:flex-row md:items-center">
        <form className="flex-1" role="search" action="/marketplace">
          {category && <input type="hidden" name="category" value={category} />}
          {sort !== "mrr" && <input type="hidden" name="sort" value={sort} />}
          <label htmlFor="q" className="sr-only">
            Search startups
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by name, pitch or category"
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </form>
        <SortSelect value={sort} options={MARKET_SORTS.map((s) => ({ value: s.value, label: s.label }))} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by category">
        <Chip href={hrefWith(searchParams, { category: undefined, show: undefined })} active={!category}>
          All
        </Chip>
        {used.map((c) => (
          <Chip key={c} href={hrefWith(searchParams, { category: c, show: undefined })} active={category === c}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="mb-3 mt-6 flex flex-wrap items-center gap-2 text-sm">
        <p className="text-ink-muted" aria-live="polite">
          <span className="num font-medium text-ink">{filtered.length}</span> {filtered.length === 1 ? "startup" : "startups"}
        </p>
        {category && <ActiveFilter label={category} href={hrefWith(searchParams, { category: undefined, show: undefined })} />}
        {q && <ActiveFilter label={`"${q}"`} href={hrefWith(searchParams, { q: undefined, show: undefined })} />}
        {hasFilters && (
          <Link href={sort === "mrr" ? "/marketplace" : `/marketplace?sort=${sort}`} className="text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            Clear all
          </Link>
        )}
      </div>

      {visible.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
          {filtered.length > visible.length && (
            <div className="mt-6 flex justify-center">
              <Link
                href={hrefWith(searchParams, { show: String(shown + PAGE_SIZE) })}
                scroll={false}
                className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                Load more ({filtered.length - visible.length} left)
              </Link>
            </div>
          )}
        </>
      ) : (
        <EmptyState title={hasFilters ? "No startups match these filters." : "No verified startups here yet."}>
          {hasFilters ? (
            <Link href="/marketplace" className="text-sm text-brand hover:underline">
              Clear filters
            </Link>
          ) : (
            <Link href="/signup?role=founder" className="text-sm text-brand hover:underline">
              List your startup
            </Link>
          )}
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
        active ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-ink-muted hover:text-ink"
      )}
    >
      {children}
    </Link>
  )
}

function ActiveFilter({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-0.5 text-caption text-ink hover:bg-line" aria-label={`Remove filter ${label}`}>
      {label} <X className="size-3" aria-hidden="true" />
    </Link>
  )
}
