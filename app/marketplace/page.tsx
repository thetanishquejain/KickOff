import Link from "next/link"
import { LayoutGrid, List, X } from "lucide-react"

import { askingMultiple, CATEGORIES, getPublishedListings, type ListingFull } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/kit"
import { ListingCard } from "@/components/listing-card"
import { ListingRow } from "@/components/listing-row"
import { PageHeader } from "@/components/page-header"

import { SortSelect } from "./sort-select"

export const dynamic = "force-dynamic"
export const metadata = { title: "Marketplace" }

const PAGE_SIZE = 12

const MARKET_SORTS = [
  { value: "mrr", label: "Highest MRR" },
  { value: "growth", label: "Fastest growth" },
  { value: "revenue", label: "Most revenue (6 mo)" },
  { value: "multiple", label: "Lowest multiple" },
  { value: "price", label: "Lowest asking price" },
  { value: "new", label: "Newest" },
] as const
type Sort = (typeof MARKET_SORTS)[number]["value"]

const MRR_BANDS = [
  { value: "", label: "Any MRR" },
  { value: "25000", label: "₹25K+" },
  { value: "50000", label: "₹50K+" },
  { value: "100000", label: "₹1L+" },
  { value: "500000", label: "₹5L+" },
]
const PRICE_BANDS = [
  { value: "", label: "Any price" },
  { value: "1000000", label: "Up to ₹10L" },
  { value: "2500000", label: "Up to ₹25L" },
  { value: "5000000", label: "Up to ₹50L" },
  { value: "10000000", label: "Up to ₹1Cr" },
]

type SP = { category?: string; q?: string; sort?: string; show?: string; view?: string; mrr?: string; price?: string; noflags?: string; forsale?: string }

function sortListings(ls: ListingFull[], sort: Sort) {
  const INF = Number.POSITIVE_INFINITY
  const by: Record<Sort, (a: ListingFull, b: ListingFull) => number> = {
    mrr: (a, b) => (b.metrics?.mrr ?? -1) - (a.metrics?.mrr ?? -1),
    growth: (a, b) => (b.metrics?.growth_pct ?? -INF) - (a.metrics?.growth_pct ?? -INF),
    revenue: (a, b) => (b.metrics?.revenue_6m ?? -1) - (a.metrics?.revenue_6m ?? -1),
    multiple: (a, b) => (askingMultiple(a) ?? INF) - (askingMultiple(b) ?? INF),
    price: (a, b) => (a.asking_price_inr ?? INF) - (b.asking_price_inr ?? INF),
    new: (a, b) => b.created_at.localeCompare(a.created_at),
  }
  return [...ls].sort(by[sort])
}

function hrefWith(sp: SP, patch: Partial<SP>) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v)
  const s = next.toString()
  return s ? `/marketplace?${s}` : "/marketplace"
}

export default async function MarketplacePage({ searchParams: sp }: { searchParams: SP }) {
  const all = await getPublishedListings()
  const q = (sp.q ?? "").trim()
  const sort = (MARKET_SORTS.find((s) => s.value === sp.sort)?.value ?? "mrr") as Sort
  const category = CATEGORIES.includes(sp.category ?? "") ? sp.category : undefined
  const minMrr = Number(sp.mrr) || 0
  const maxPrice = Number(sp.price) || 0
  const view = sp.view === "list" ? "list" : "grid"

  const filtered = sortListings(
    all.filter(
      (l) =>
        (!category || l.category === category) &&
        (!q || `${l.name} ${l.pitch} ${l.category}`.toLowerCase().includes(q.toLowerCase())) &&
        (!minMrr || (l.metrics?.mrr ?? 0) >= minMrr) &&
        (!maxPrice || (l.asking_price_inr !== null && l.asking_price_inr <= maxPrice)) &&
        (!sp.noflags || l.flags.length === 0) &&
        (!sp.forsale || Boolean(l.asking_price_inr))
    ),
    sort
  )
  const shown = Math.max(PAGE_SIZE, Number(sp.show) || PAGE_SIZE)
  const visible = filtered.slice(0, shown)

  const chips: { label: string; href: string }[] = []
  if (category) chips.push({ label: category, href: hrefWith(sp, { category: undefined, show: undefined }) })
  if (q) chips.push({ label: `"${q}"`, href: hrefWith(sp, { q: undefined, show: undefined }) })
  if (minMrr) chips.push({ label: `MRR ${MRR_BANDS.find((b) => b.value === sp.mrr)?.label ?? inrShort(minMrr) + "+"}`, href: hrefWith(sp, { mrr: undefined, show: undefined }) })
  if (maxPrice) chips.push({ label: PRICE_BANDS.find((b) => b.value === sp.price)?.label ?? `Up to ${inrShort(maxPrice)}`, href: hrefWith(sp, { price: undefined, show: undefined }) })
  if (sp.noflags) chips.push({ label: "No risk flags", href: hrefWith(sp, { noflags: undefined, show: undefined }) })
  if (sp.forsale) chips.push({ label: "Priced only", href: hrefWith(sp, { forsale: undefined, show: undefined }) })
  const clearHref = hrefWith({ sort: sp.sort, view: sp.view }, {})

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, all.filter((l) => l.category === c).length]))

  return (
    <div className="pb-8">
      <PageHeader title="Marketplace">
        Indian startups for sale, with MRR and revenue calculated from each founder&apos;s Razorpay payment data.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[232px_1fr]">
        {/* Filters */}
        <aside aria-label="Filters" className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <form action="/marketplace" role="search" className="flex flex-col gap-2">
            {Object.entries({ category, sort: sp.sort, view: sp.view, mrr: sp.mrr, price: sp.price, noflags: sp.noflags, forsale: sp.forsale }).map(([k, v]) =>
              v ? <input key={k} type="hidden" name={k} value={v} /> : null
            )}
            <label htmlFor="mq" className="text-caption font-medium uppercase tracking-wide text-ink-muted">
              Search
            </label>
            <input
              id="mq"
              name="q"
              defaultValue={q}
              placeholder="Name, pitch, category"
              className="h-9 rounded-md border border-line bg-surface px-3 text-sm placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </form>

          <FilterGroup title="Category">
            <FilterLink href={hrefWith(sp, { category: undefined, show: undefined })} active={!category} count={all.length}>
              All categories
            </FilterLink>
            {CATEGORIES.filter((c) => counts[c] > 0).map((c) => (
              <FilterLink key={c} href={hrefWith(sp, { category: c, show: undefined })} active={category === c} count={counts[c]}>
                {c}
              </FilterLink>
            ))}
          </FilterGroup>

          <FilterGroup title="Verified MRR">
            {MRR_BANDS.map((b) => (
              <FilterLink key={b.label} href={hrefWith(sp, { mrr: b.value || undefined, show: undefined })} active={(sp.mrr ?? "") === b.value}>
                {b.label}
              </FilterLink>
            ))}
          </FilterGroup>

          <FilterGroup title="Asking price">
            {PRICE_BANDS.map((b) => (
              <FilterLink key={b.label} href={hrefWith(sp, { price: b.value || undefined, show: undefined })} active={(sp.price ?? "") === b.value}>
                {b.label}
              </FilterLink>
            ))}
          </FilterGroup>

          <FilterGroup title="Other">
            <ToggleLink href={hrefWith(sp, { noflags: sp.noflags ? undefined : "1", show: undefined })} on={Boolean(sp.noflags)}>
              Hide listings with risk flags
            </ToggleLink>
            <ToggleLink href={hrefWith(sp, { forsale: sp.forsale ? undefined : "1", show: undefined })} on={Boolean(sp.forsale)}>
              Only listings with a price
            </ToggleLink>
          </FilterGroup>
        </aside>

        {/* Results */}
        <section aria-label="Results" className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted" aria-live="polite">
              <span className="num font-semibold text-ink">{filtered.length}</span> {filtered.length === 1 ? "startup" : "startups"}
              {filtered.length !== all.length && <span> of {all.length}</span>}
            </p>
            <div className="flex items-center gap-2">
              <SortSelect value={sort} options={MARKET_SORTS.map((s) => ({ value: s.value, label: s.label }))} />
              <div className="flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Layout">
                <Link
                  href={hrefWith(sp, { view: undefined })}
                  aria-pressed={view === "grid"}
                  aria-label="Grid view"
                  className={cn("rounded p-1.5", view === "grid" ? "bg-surface-hover text-ink" : "text-ink-muted hover:text-ink")}
                >
                  <LayoutGrid className="size-4" />
                </Link>
                <Link
                  href={hrefWith(sp, { view: "list" })}
                  aria-pressed={view === "list"}
                  aria-label="List view"
                  className={cn("rounded p-1.5", view === "list" ? "bg-surface-hover text-ink" : "text-ink-muted hover:text-ink")}
                >
                  <List className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  aria-label={`Remove filter ${c.label}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-caption text-ink hover:bg-surface-hover"
                >
                  {c.label} <X className="size-3" aria-hidden="true" />
                </Link>
              ))}
              <Link href={clearHref} className="text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                Clear all
              </Link>
            </div>
          )}

          {visible.length ? (
            view === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((l) => (
                  <ListingCard key={l.id} l={l} />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {visible.map((l) => (
                  <ListingRow key={l.id} l={l} />
                ))}
              </ul>
            )
          ) : (
            <EmptyState title={chips.length ? "No startups match these filters." : "No verified startups listed yet."}>
              {chips.length ? (
                <Link href={clearHref} className="text-sm text-brand hover:underline">
                  Clear filters
                </Link>
              ) : (
                <Link href="/signup?role=founder" className="text-sm text-brand hover:underline">
                  List your startup
                </Link>
              )}
            </EmptyState>
          )}

          {filtered.length > visible.length && (
            <div className="mt-6 flex justify-center">
              <Link
                href={hrefWith(sp, { show: String(shown + PAGE_SIZE) })}
                scroll={false}
                className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
              >
                Load more · {filtered.length - visible.length} left
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-0.5">
      <legend className="mb-1.5 text-caption font-medium uppercase tracking-wide text-ink-muted">{title}</legend>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">{children}</div>
    </fieldset>
  )
}

function FilterLink({ href, active, count, children }: { href: string; active: boolean; count?: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors duration-150 lg:border-transparent",
        active ? "border-brand bg-brand/10 font-medium text-brand" : "border-line bg-surface text-ink hover:bg-surface-hover lg:bg-transparent"
      )}
    >
      <span>{children}</span>
      {count !== undefined && <span className="num text-caption text-ink-muted">{count}</span>}
    </Link>
  )
}

function ToggleLink({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} role="switch" aria-checked={on} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm text-ink hover:text-brand">
      <span className={cn("relative h-4 w-7 rounded-full transition-colors duration-150", on ? "bg-brand" : "bg-line")} aria-hidden="true">
        <span className={cn("absolute top-0.5 size-3 rounded-full bg-surface shadow transition-all duration-150", on ? "left-3.5" : "left-0.5")} />
      </span>
      {children}
    </Link>
  )
}
