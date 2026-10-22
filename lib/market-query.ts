// Marketplace URL state + database query builder.
// Pure functions only: no Supabase import, so the same code runs in tests against fixtures.
//
// URL contract (inactive filters and defaults are omitted):
//   /marketplace?q=&category=saas&business_model=b2b&min_mrr=100000&max_price=1000000&max_multiple=3
//               &growth=positive&for_sale=true&hide_risks=true&sort=mrr&range=30d&page=1&limit=12&view=list

export const CATEGORY_LIST = [
  "SaaS",
  "AI tool",
  "Fintech",
  "E-commerce tools",
  "Marketing",
  "Developer tools",
  "EdTech",
  "HR & productivity",
  "Mobile app",
  "Other",
] as const

export function categorySlug(c: string) {
  return c
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const CATEGORY_BY_KEY = new Map<string, string>()
for (const c of CATEGORY_LIST) {
  CATEGORY_BY_KEY.set(categorySlug(c), c)
  CATEGORY_BY_KEY.set(c.toLowerCase(), c)
}
// Common spellings people type or link with.
CATEGORY_BY_KEY.set("software-as-a-service", "SaaS")
CATEGORY_BY_KEY.set("ai", "AI tool")
CATEGORY_BY_KEY.set("ai-tools", "AI tool")
CATEGORY_BY_KEY.set("ecommerce", "E-commerce tools")
CATEGORY_BY_KEY.set("devtools", "Developer tools")

/** Canonical category name for any accepted spelling, or null. Case-insensitive. */
export function canonicalCategory(v: string | undefined | null): string | null {
  if (!v) return null
  const k = v.trim().toLowerCase()
  return CATEGORY_BY_KEY.get(k) ?? CATEGORY_BY_KEY.get(categorySlug(k)) ?? null
}

export const BUSINESS_MODELS = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
  { value: "b2b2c", label: "B2B and B2C" },
] as const
export type BusinessModel = (typeof BUSINESS_MODELS)[number]["value"]

export const GROWTH_OPTIONS = [
  { value: "positive", label: "Positive", min: 0, strict: true },
  { value: "gte10", label: "10%+ a month", min: 10, strict: false },
  { value: "gte25", label: "25%+ a month", min: 25, strict: false },
] as const
export type GrowthOption = (typeof GROWTH_OPTIONS)[number]["value"]

export const MARKET_SORTS = [
  { value: "mrr", label: "Highest MRR", ranged: false },
  { value: "revenue", label: "Highest revenue", ranged: true },
  { value: "growth", label: "Highest growth", ranged: false },
  { value: "price_asc", label: "Lowest asking price", ranged: false },
  { value: "price_desc", label: "Highest asking price", ranged: false },
  { value: "multiple_asc", label: "Lowest ARR multiple", ranged: false },
  { value: "recent", label: "Recently listed", ranged: false },
  { value: "revenue_per_visitor", label: "Revenue per visitor", ranged: true },
] as const
export type MarketSort = (typeof MARKET_SORTS)[number]["value"]

export const MARKET_RANGES = [
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "all", label: "All time" },
] as const
export type MarketRange = (typeof MARKET_RANGES)[number]["value"]

export const DEFAULT_LIMIT = 12
export const MAX_LIMIT = 48
const MAX_PAGE = 10_000
const MAX_MONEY = 1e12 // ₹1 lakh crore: anything above is a typo, not a filter

export type MarketState = {
  q: string
  category: string | null
  businessModel: BusinessModel | null
  minMrr: number | null
  maxPrice: number | null
  maxMultiple: number | null
  growth: GrowthOption | null
  forSale: boolean
  hideRisks: boolean
  sort: MarketSort
  range: MarketRange
  page: number
  limit: number
  view: "grid" | "list"
}

export const DEFAULT_STATE: MarketState = {
  q: "",
  category: null,
  businessModel: null,
  minMrr: null,
  maxPrice: null,
  maxMultiple: null,
  growth: null,
  forSale: false,
  hideRisks: false,
  sort: "mrr",
  range: "30d",
  page: 1,
  limit: DEFAULT_LIMIT,
  view: "grid",
}

type Raw = Record<string, string | string[] | undefined>

/** First value of a possibly repeated parameter (duplicates are ignored, deterministically). */
function first(raw: Raw, key: string): string | undefined {
  const v = raw[key]
  const s = Array.isArray(v) ? v[0] : v
  return s === undefined ? undefined : String(s).trim()
}

/** Non-negative finite amount rounded to paise, or null. Accepts "1,00,000" and "100000". */
export function parseMoney(v: string | undefined): number | null {
  if (v === undefined || v === "") return null
  const cleaned = v.replace(/[,\s₹]/g, "")
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0 || n > MAX_MONEY) return null
  return Math.round(n * 100) / 100
}

function parseBool(v: string | undefined): boolean | null {
  if (v === undefined) return null
  const s = v.toLowerCase()
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true
  if (s === "false" || s === "0" || s === "no" || s === "off") return false
  return null
}

function parsePositiveInt(v: string | undefined, max: number): number | null {
  if (!v || !/^\d+$/.test(v)) return null
  const n = Number(v)
  return n >= 1 && n <= max ? n : null
}

const LEGACY_SORT: Record<string, MarketSort> = { price: "price_asc", multiple: "multiple_asc", new: "recent", rpv: "revenue_per_visitor" }
const LEGACY_GROWTH: Record<string, GrowthOption> = { "0": "positive", "10": "gte10", "25": "gte25" }

/**
 * Normalise URL search params into a complete, valid state. Unknown keys are ignored;
 * invalid values fall back to defaults and are reported in `invalid` (never thrown).
 */
export function parseMarketParams(raw: Raw): { state: MarketState; invalid: string[] } {
  const invalid: string[] = []
  const s: MarketState = { ...DEFAULT_STATE }

  s.q = (first(raw, "q") ?? "").slice(0, 80)

  const cat = first(raw, "category")
  if (cat) {
    s.category = canonicalCategory(cat)
    if (!s.category) invalid.push("category")
  }

  const bm = first(raw, "business_model")?.toLowerCase()
  if (bm) {
    s.businessModel = (BUSINESS_MODELS.find((b) => b.value === bm)?.value ?? null) as BusinessModel | null
    if (!s.businessModel) invalid.push("business_model")
  }

  const money = (key: string, legacy: string) => {
    const v = first(raw, key) ?? first(raw, legacy)
    const n = parseMoney(v)
    if (v !== undefined && v !== "" && n === null) invalid.push(key)
    return n
  }
  s.minMrr = money("min_mrr", "mrr")
  s.maxPrice = money("max_price", "price")
  const mm = first(raw, "max_multiple") ?? first(raw, "mult")
  if (mm) {
    const n = parseMoney(mm)
    s.maxMultiple = n !== null && n > 0 && n <= 1000 ? n : null
    if (s.maxMultiple === null) invalid.push("max_multiple")
  }

  const g = first(raw, "growth")?.toLowerCase()
  if (g) {
    s.growth = (GROWTH_OPTIONS.find((o) => o.value === g)?.value ?? LEGACY_GROWTH[g] ?? null) as GrowthOption | null
    if (!s.growth) invalid.push("growth")
  }

  const fs = first(raw, "for_sale") ?? first(raw, "forsale")
  if (fs !== undefined) {
    const b = parseBool(fs)
    if (b === null) invalid.push("for_sale")
    else s.forSale = b
  }
  const hr = first(raw, "hide_risks") ?? first(raw, "noflags")
  if (hr !== undefined) {
    const b = parseBool(hr)
    if (b === null) invalid.push("hide_risks")
    else s.hideRisks = b
  }

  const so = first(raw, "sort")?.toLowerCase()
  if (so) {
    const known = MARKET_SORTS.find((x) => x.value === so)?.value ?? LEGACY_SORT[so]
    if (known) s.sort = known
    else invalid.push("sort")
  }
  const r = first(raw, "range")?.toLowerCase()
  if (r) {
    const known = MARKET_RANGES.find((x) => x.value === r)?.value
    if (known) s.range = known
    else invalid.push("range")
  }

  const p = first(raw, "page")
  if (p !== undefined) {
    const n = parsePositiveInt(p, MAX_PAGE)
    if (n === null) invalid.push("page")
    else s.page = n
  }
  const l = first(raw, "limit")
  if (l !== undefined) {
    const n = parsePositiveInt(l, 1000)
    if (n === null) invalid.push("limit")
    else s.limit = Math.min(n, MAX_LIMIT)
  }
  if (first(raw, "view") === "list") s.view = "list"
  return { state: s, invalid }
}

/** True when the sort uses the reporting range (revenue and revenue-per-visitor). */
export function sortUsesRange(sort: MarketSort) {
  return MARKET_SORTS.find((x) => x.value === sort)?.ranged ?? false
}

/** Canonical query string, fixed key order, defaults and inactive filters omitted. */
export function toSearchParams(s: MarketState): URLSearchParams {
  const p = new URLSearchParams()
  if (s.q) p.set("q", s.q)
  if (s.category) p.set("category", categorySlug(s.category))
  if (s.businessModel) p.set("business_model", s.businessModel)
  if (s.minMrr !== null) p.set("min_mrr", String(s.minMrr))
  if (s.maxPrice !== null) p.set("max_price", String(s.maxPrice))
  if (s.maxMultiple !== null) p.set("max_multiple", String(s.maxMultiple))
  if (s.growth) p.set("growth", s.growth)
  if (s.forSale) p.set("for_sale", "true")
  if (s.hideRisks) p.set("hide_risks", "true")
  if (s.sort !== DEFAULT_STATE.sort) p.set("sort", s.sort)
  if (sortUsesRange(s.sort) && s.range !== DEFAULT_STATE.range) p.set("range", s.range)
  if (s.page > 1) p.set("page", String(s.page))
  if (s.limit !== DEFAULT_LIMIT) p.set("limit", String(s.limit))
  if (s.view === "list") p.set("view", "list")
  return p
}

export function marketHref(s: MarketState): string {
  const qs = toSearchParams(s).toString()
  return qs ? `/marketplace?${qs}` : "/marketplace"
}

/** Apply a change; any change except page/view sends the user back to page 1. */
export function withChange(s: MarketState, patch: Partial<MarketState>): MarketState {
  const keepsPage = Object.keys(patch).every((k) => k === "page" || k === "view")
  return { ...s, ...patch, page: keepsPage ? patch.page ?? s.page : 1 }
}

export function countActiveFilters(s: MarketState): number {
  return [s.q, s.category, s.businessModel, s.minMrr, s.maxPrice, s.maxMultiple, s.growth, s.forSale || null, s.hideRisks || null].filter(
    (v) => v !== null && v !== ""
  ).length
}

// ---------- Database query ----------

/** The subset of the PostgREST builder the marketplace uses. Lets tests run the same query on fixtures. */
export interface Filterable<T> {
  eq(column: string, value: unknown): T
  gt(column: string, value: number): T
  gte(column: string, value: number): T
  lte(column: string, value: number): T
  or(filters: string): T
  order(column: string, opts: { ascending: boolean; nullsFirst: boolean }): T
  range(from: number, to: number): T
}

type SortCol = { col: string; ascending: boolean }

/** Fixed server-side allowlist: URL sort keys never reach the query as text. */
export function sortColumns(sort: MarketSort, range: MarketRange): SortCol[] {
  const ranged = { "30d": "30d", "6m": "6m", all: "all" }[range]
  const main: Record<MarketSort, SortCol> = {
    mrr: { col: "mrr", ascending: false },
    revenue: { col: `revenue_${ranged}`, ascending: false },
    growth: { col: "growth_pct", ascending: false },
    price_asc: { col: "asking_price_inr", ascending: true },
    price_desc: { col: "asking_price_inr", ascending: false },
    multiple_asc: { col: "arr_multiple", ascending: true },
    recent: { col: "published_at", ascending: false },
    revenue_per_visitor: { col: `rpv_${ranged}`, ascending: false },
  }
  // Stable tie-breakers so rows never jump between pages.
  const ties: SortCol[] = sort === "recent" ? [{ col: "id", ascending: true }] : [{ col: "published_at", ascending: false }, { col: "id", ascending: true }]
  return [main[sort], ...ties]
}

/** Strip characters that have meaning in PostgREST filter syntax. */
export function safeSearch(q: string): string {
  return q.replace(/[%*,().\\:"']/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Apply every active filter, the sort and the page window. Missing metrics never pass a
 * threshold: SQL comparisons with NULL are false, so a listing without MRR fails min_mrr,
 * one without growth fails "positive", one without ARR has no multiple and fails max_multiple.
 */
export function buildMarketQuery<T extends Filterable<T>>(q: T, s: MarketState): T {
  let x = q.eq("status", "published")
  if (s.forSale) x = x.eq("is_for_sale", true)
  if (s.category) x = x.eq("category", s.category)
  if (s.businessModel) x = x.eq("business_model", s.businessModel)
  if (s.minMrr !== null) x = x.gte("mrr", s.minMrr)
  if (s.maxPrice !== null) x = x.lte("asking_price_inr", s.maxPrice)
  if (s.maxMultiple !== null) x = x.lte("arr_multiple", s.maxMultiple)
  if (s.growth) {
    const g = GROWTH_OPTIONS.find((o) => o.value === s.growth)!
    x = g.strict ? x.gt("growth_pct", g.min) : x.gte("growth_pct", g.min)
  }
  if (s.hideRisks) x = x.eq("flag_count", 0)
  const term = safeSearch(s.q)
  if (term) x = x.or(`name.ilike.*${term}*,pitch.ilike.*${term}*,category.ilike.*${term}*`)
  for (const c of sortColumns(s.sort, s.range)) x = x.order(c.col, { ascending: c.ascending, nullsFirst: false })
  const from = (s.page - 1) * s.limit
  return x.range(from, from + s.limit - 1)
}

/** Row shape of the public.marketplace_listings view (numerics arrive as numbers or strings). */
export type MarketRow = {
  id: string
  name: string
  category: string
  status: string
  is_for_sale: boolean
  business_model: string | null
  asking_price_inr: number | string | null
  mrr: number | string | null
  arr: number | string | null
  growth_pct: number | string | null
  arr_multiple: number | string | null
  flag_count: number
  revenue_30d: number | string | null
  revenue_6m: number | string | null
  revenue_all: number | string | null
  rpv_30d: number | string | null
  rpv_6m: number | string | null
  rpv_all: number | string | null
  published_at: string
  computed_at: string | null
  is_demo: boolean
}

/** For sale only when the founder said so. Rows saved before the is_for_sale column existed fall back to "has an asking price". */
export function isForSale(l: { is_for_sale?: boolean | null; asking_price_inr: number | null }): boolean {
  return typeof l.is_for_sale === "boolean" ? l.is_for_sale : Boolean(l.asking_price_inr)
}
