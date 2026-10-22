import Link from "next/link"
import { ChevronLeft, ChevronRight, LayoutGrid, List, X } from "lucide-react"

import { categoryCounts, queryMarketplace } from "@/lib/data"
import { inr } from "@/lib/format"
import { BUSINESS_MODELS, countActiveFilters, DEFAULT_STATE, GROWTH_OPTIONS, marketHref, MARKET_RANGES, MARKET_SORTS, parseMarketParams, sortUsesRange, withChange, type MarketState } from "@/lib/market-query"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/kit"
import { ListingCard } from "@/components/listing-card"
import { ListingRow } from "@/components/listing-row"
import { PageHeader } from "@/components/page-header"

import { FilterPanel } from "./filter-panel"
import { FilterToggle } from "./filter-toggle"
import { MarketSortControls } from "./sort-select"

export const dynamic = "force-dynamic"
export const metadata = { title: "Marketplace" }

function chipsFor(s: MarketState) {
  const chips: { label: string; href: string }[] = []
  const rm = (patch: Partial<MarketState>) => marketHref(withChange(s, patch))
  if (s.q) chips.push({ label: `"${s.q}"`, href: rm({ q: "" }) })
  if (s.category) chips.push({ label: s.category, href: rm({ category: null }) })
  if (s.businessModel) chips.push({ label: BUSINESS_MODELS.find((b) => b.value === s.businessModel)!.label, href: rm({ businessModel: null }) })
  if (s.minMrr !== null) chips.push({ label: `MRR ≥ ${inr(s.minMrr)}`, href: rm({ minMrr: null }) })
  if (s.maxPrice !== null) chips.push({ label: `Price ≤ ${inr(s.maxPrice)}`, href: rm({ maxPrice: null }) })
  if (s.maxMultiple !== null) chips.push({ label: `Multiple ≤ ${s.maxMultiple}x`, href: rm({ maxMultiple: null }) })
  if (s.growth) chips.push({ label: `Growth: ${GROWTH_OPTIONS.find((g) => g.value === s.growth)!.label.toLowerCase()}`, href: rm({ growth: null }) })
  if (s.forSale) chips.push({ label: "For sale only", href: rm({ forSale: false }) })
  if (s.hideRisks) chips.push({ label: "Risk flags hidden", href: rm({ hideRisks: false }) })
  return chips
}

export default async function MarketplacePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { state, invalid } = parseMarketParams(searchParams)
  const [result, counts] = await Promise.all([queryMarketplace(state), categoryCounts()])
  const { listings, total, error } = result
  const pages = Math.max(1, Math.ceil(total / state.limit))
  const chips = chipsFor(state)
  const resetHref = marketHref({ ...DEFAULT_STATE, sort: state.sort, range: state.range, view: state.view })
  const from = total ? (state.page - 1) * state.limit + 1 : 0
  const to = Math.min(total, state.page * state.limit)
  const sortLabel = MARKET_SORTS.find((x) => x.value === state.sort)!.label
  const rangeLabel = MARKET_RANGES.find((x) => x.value === state.range)!.label

  return (
    <div className="pb-8">
      <PageHeader title="Marketplace">Indian startups with MRR and revenue calculated from each founder&apos;s Razorpay payment data.</PageHeader>

      <div className="grid gap-6 lg:grid-cols-[248px_1fr]">
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-4 lg:pr-1">
          <FilterToggle active={countActiveFilters(state)}>
            {/* Remount on every URL so local drafts always match the applied filters (incl. Back/Forward). */}
            <FilterPanel key={marketHref(state)} state={state} counts={counts} />
          </FilterToggle>
        </aside>

        <section aria-label="Results" className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {error ? (
                "Results couldn't load"
              ) : (
                <>
                  <span className="num font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "startup" : "startups"}
                  {total > state.limit && (
                    <span className="num">
                      {" "}
                      · showing {from}–{to}
                    </span>
                  )}
                  <span>
                    {" "}
                    · {sortLabel.replace(/^Highest |^Lowest |^Recently /, (w) => w.toLowerCase())}
                    {sortUsesRange(state.sort) ? `, ${rangeLabel.toLowerCase()}` : ""}
                  </span>
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <MarketSortControls state={state} />
              <div className="flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Layout">
                {(["grid", "list"] as const).map((v) => (
                  <Link
                    key={v}
                    href={marketHref({ ...state, view: v })}
                    scroll={false}
                    aria-pressed={state.view === v}
                    aria-label={v === "grid" ? "Grid view" : "List view"}
                    className={cn("rounded p-1.5", state.view === v ? "bg-surface-hover text-ink" : "text-ink-muted hover:text-ink")}
                  >
                    {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {invalid.length > 0 && (
            <p className="mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-caption text-ink">
              Some link settings weren&apos;t valid and were ignored ({invalid.join(", ")}).
            </p>
          )}

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  scroll={false}
                  aria-label={`Remove filter: ${c.label}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-caption text-ink hover:bg-surface-hover"
                >
                  {c.label} <X className="size-3" aria-hidden="true" />
                </Link>
              ))}
              <Link href={resetHref} scroll={false} className="text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                Clear all
              </Link>
            </div>
          )}

          {error ? (
            <EmptyState title="We couldn't load startups right now.">
              <p className="text-sm text-ink-muted">Your filters are kept in the link.</p>
              <Link href={marketHref(state)} className="text-sm font-medium text-brand hover:underline">
                Try again
              </Link>
            </EmptyState>
          ) : listings.length ? (
            state.view === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => (
                  <ListingCard key={l.id} l={l} />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {listings.map((l) => (
                  <ListingRow key={l.id} l={l} />
                ))}
              </ul>
            )
          ) : total > 0 && state.page > pages ? (
            <EmptyState title={`Page ${state.page} doesn't exist for these filters.`}>
              <Link href={marketHref({ ...state, page: pages })} className="text-sm font-medium text-brand hover:underline">
                Go to page {pages}
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title={chips.length ? "No startups match all of these filters." : "No verified startups listed yet."}>
              {chips.length ? (
                <>
                  <p className="text-sm text-ink-muted">Remove one filter above, or start over.</p>
                  <Link href={resetHref} className="text-sm font-medium text-brand hover:underline">
                    Reset filters
                  </Link>
                </>
              ) : (
                <Link href="/signup?role=founder" className="text-sm text-brand hover:underline">
                  List your startup
                </Link>
              )}
            </EmptyState>
          )}

          {pages > 1 && listings.length > 0 && <Pagination state={state} pages={pages} />}
        </section>
      </div>
    </div>
  )
}

function Pagination({ state, pages }: { state: MarketState; pages: number }) {
  const p = state.page
  const nums = [...new Set([1, p - 1, p, p + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const link = (n: number) => marketHref({ ...state, page: n })
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-1">
      {p > 1 ? (
        <Link href={link(p - 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-sm hover:bg-surface-hover">
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
          <Link
            href={link(n)}
            aria-current={n === p ? "page" : undefined}
            className={cn("num inline-flex size-9 items-center justify-center rounded-md border text-sm", n === p ? "border-brand bg-brand/10 font-semibold text-brand" : "border-line bg-surface hover:bg-surface-hover")}
          >
            {n}
          </Link>
        </span>
      ))}
      {p < pages ? (
        <Link href={link(p + 1)} className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-sm hover:bg-surface-hover">
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  )
}
