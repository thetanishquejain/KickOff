// Marketplace filter, URL, sort and pagination tests.
// Runs the exact query the app sends to the database (buildMarketQuery) against fixture rows
// with SQL semantics (MemoryQuery: NULL comparisons are false, NULLs sort last).
// Run: pnpm test:market

import { MemoryQuery } from "../lib/market-memory"
import {
  buildMarketQuery,
  canonicalCategory,
  DEFAULT_STATE,
  marketHref,
  MARKET_SORTS,
  parseMarketParams,
  sortColumns,
  toSearchParams,
  withChange,
  type MarketState,
} from "../lib/market-query"

let passed = 0
let failed = 0
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++
  else failed++
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail && !ok ? ` :: ${detail}` : ""}`)
}
const eqSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

// ---------- Fixtures (one per case in the spec) ----------
type Row = Record<string, unknown>
let n = 0
function row(id: string, o: Row): Row {
  n++
  return {
    id,
    name: id,
    pitch: `${id} pitch`,
    category: "SaaS",
    status: "published",
    is_for_sale: true,
    business_model: "b2b",
    asking_price_inr: 800000,
    mrr: 150000,
    arr: 1800000,
    growth_pct: 5,
    arr_multiple: 0.44,
    flag_count: 0,
    revenue_30d: 150000,
    revenue_6m: 800000,
    revenue_all: 900000,
    rpv_30d: null,
    rpv_6m: null,
    rpv_all: null,
    published_at: `2026-10-${String(10 + (n % 15)).padStart(2, "0")}T10:00:00Z`,
    is_demo: true,
    ...o,
  }
}

const F: Row[] = [
  row("exact_boundaries", { mrr: 100000, asking_price_inr: 1000000, growth_pct: 4.2, arr: 1200000, arr_multiple: 0.83 }),
  row("ok_b2c_flagged", { business_model: "b2c", flag_count: 2, mrr: 300000, asking_price_inr: 900000, growth_pct: 12 }),
  row("ok_no_model", { business_model: null, mrr: 120000, asking_price_inr: 500000, growth_pct: 1 }),
  row("below_mrr", { mrr: 99999.99 }),
  row("above_price", { asking_price_inr: 1000000.01 }),
  row("not_saas", { category: "Fintech" }),
  row("zero_growth", { growth_pct: 0 }),
  row("negative_growth", { growth_pct: -3 }),
  row("missing_growth", { growth_pct: null }), // previous month missing or zero MRR
  row("missing_mrr", { mrr: null, arr: null, arr_multiple: null }),
  row("missing_price", { asking_price_inr: null, arr_multiple: null }),
  row("no_arr", { arr: 0, arr_multiple: null, mrr: 100000 }),
  row("draft", { status: "draft" }),
  row("not_for_sale", { is_for_sale: false }),
]

function run(s: MarketState, rows = F) {
  return buildMarketQuery(new MemoryQuery(rows), s).run()
}
const ids = (s: MarketState, rows = F) => run(s, rows).data.map((r) => r.id as string)

// ---------- A. The selected configuration ----------
const SELECTED_URL = "/marketplace?category=saas&min_mrr=100000&max_price=1000000&growth=positive&for_sale=true&hide_risks=false&sort=mrr&range=30d&page=1"
const sel = parseMarketParams(Object.fromEntries(new URL(SELECTED_URL, "http://x").searchParams)).state
check("A1 selected URL parses with no invalid params", parseMarketParams(Object.fromEntries(new URL(SELECTED_URL, "http://x").searchParams)).invalid.length === 0)
check(
  "A2 selected URL initialises every control",
  sel.category === "SaaS" && sel.businessModel === null && sel.minMrr === 100000 && sel.maxPrice === 1000000 && sel.maxMultiple === null && sel.growth === "positive" && sel.forSale && !sel.hideRisks && sel.sort === "mrr" && sel.range === "30d" && sel.page === 1
)
// no_arr qualifies: MRR ₹1L, valid growth, priced; an unavailable multiple only matters when max_multiple is set.
const expected = ["exact_boundaries", "ok_b2c_flagged", "ok_no_model", "no_arr"]
check("A3 selected config returns exactly the eligible listings", eqSet(ids({ ...sel, limit: 48 }), expected), ids({ ...sel, limit: 48 }).join(","))
check("A4 any business model is included", ids({ ...sel, limit: 48 }).includes("ok_b2c_flagged") && ids({ ...sel, limit: 48 }).includes("ok_no_model"))
check("A5 flagged listing stays visible when hide_risks is off", ids({ ...sel, limit: 48 }).includes("ok_b2c_flagged"))
for (const bad of ["below_mrr", "above_price", "not_saas", "zero_growth", "negative_growth", "missing_growth", "missing_mrr", "missing_price", "draft", "not_for_sale"])
  check(`A6 excluded: ${bad}`, !ids({ ...sel, limit: 48 }).includes(bad))

// ---------- B. Boundaries ----------
const only = (o: Partial<MarketState>) => ({ ...DEFAULT_STATE, limit: 48, ...o })
check("B1 MRR ₹99,999.99 excluded at min ₹1,00,000", !ids(only({ minMrr: 100000 })).includes("below_mrr"))
check("B2 MRR ₹1,00,000 included at min ₹1,00,000", ids(only({ minMrr: 100000 })).includes("exact_boundaries"))
check("B3 price ₹10,00,000 included at max ₹10,00,000", ids(only({ maxPrice: 1000000 })).includes("exact_boundaries"))
check("B4 price ₹10,00,000.01 excluded at max ₹10,00,000", !ids(only({ maxPrice: 1000000 })).includes("above_price"))
check("B5 growth exactly 0% is not positive", !ids(only({ growth: "positive" })).includes("zero_growth"))
check("B6 growth from an invalid comparison (null) is not positive", !ids(only({ growth: "positive" })).includes("missing_growth"))
check("B7 missing ARR has no multiple and fails max_multiple", !ids(only({ maxMultiple: 3 })).includes("no_arr") && !ids(only({ maxMultiple: 3 })).includes("missing_mrr"))
check("B8 missing ARR still listed when no multiple filter", ids(only({})).includes("no_arr"))
check("B9 hide_risks on removes flagged listing", !ids(only({ hideRisks: true })).includes("ok_b2c_flagged") && ids(only({ hideRisks: false })).includes("ok_b2c_flagged"))
check("B10 draft never appears, with or without for_sale", !ids(only({})).includes("draft") && !ids(only({ forSale: true })).includes("draft"))
check("B11 not-for-sale listing hidden only when for_sale is on", ids(only({})).includes("not_for_sale") && !ids(only({ forSale: true })).includes("not_for_sale"))
check("B12 missing price fails max_price, missing MRR fails min_mrr", !ids(only({ maxPrice: 5e7 })).includes("missing_price") && !ids(only({ minMrr: 1 })).includes("missing_mrr"))

// ---------- C. URL state ----------
const p = (q: string) => parseMarketParams(Object.fromEntries(new URLSearchParams(q)))
check("C1 defaults: empty URL gives default state", JSON.stringify(p("").state) === JSON.stringify(DEFAULT_STATE))
check("C2 defaults omitted from canonical URL", marketHref(DEFAULT_STATE) === "/marketplace")
check("C3 canonical URL round-trips", JSON.stringify(p(toSearchParams(sel).toString()).state) === JSON.stringify({ ...sel }))
check("C4 canonical order is fixed", toSearchParams(sel).toString() === "category=saas&min_mrr=100000&max_price=1000000&growth=positive&for_sale=true")
check("C5 negative number rejected", p("min_mrr=-5").state.minMrr === null && p("min_mrr=-5").invalid.includes("min_mrr"))
check("C6 non-finite and junk rejected", p("max_price=Infinity").state.maxPrice === null && p("max_price=1e5").state.maxPrice === null && p("min_mrr=abc").state.minMrr === null)
check("C7 Indian grouping accepted", p("min_mrr=1,00,000").state.minMrr === 100000)
check("C8 unknown sort falls back to mrr and is reported", p("sort=drop%20table").state.sort === "mrr" && p("sort=drop%20table").invalid.includes("sort"))
check("C9 unknown params ignored without error", p("foo=bar&utm_source=x").invalid.length === 0)
check("C10 duplicated params: first value wins", parseMarketParams({ category: ["fintech", "saas"] }).state.category === "Fintech")
check("C11 category is case-insensitive and canonical", canonicalCategory("SAAS") === "SaaS" && canonicalCategory("Software as a Service") === "SaaS" && canonicalCategory("e-commerce-tools") === "E-commerce tools")
check("C12 bad page and over-limit normalised", p("page=0").state.page === 1 && p("page=-2").state.page === 1 && p("limit=500").state.limit === 48)
check("C13 any filter change resets page to 1", withChange({ ...sel, page: 4 }, { minMrr: 50000 }).page === 1 && withChange({ ...sel, page: 4 }, { sort: "growth" }).page === 1)
check("C14 page change keeps page", withChange({ ...sel, page: 1 }, { page: 3 }).page === 3)
check("C15 legacy links still work", p("mrr=100000&price=1000000&noflags=1&forsale=1&sort=new&growth=0").state.minMrr === 100000 && p("sort=new").state.sort === "recent" && p("noflags=1").state.hideRisks && p("growth=0").state.growth === "positive")
check("C16 range only written for ranged sorts", !toSearchParams({ ...DEFAULT_STATE, range: "6m" }).has("range") && toSearchParams({ ...DEFAULT_STATE, sort: "revenue", range: "6m" }).get("range") === "6m")
check("C17 reset clears filters, keeps sort", marketHref({ ...DEFAULT_STATE, sort: "growth" }) === "/marketplace?sort=growth")

// ---------- D. Sorting and pagination ----------
const pub = F.filter((r) => r.status === "published")
for (const so of MARKET_SORTS) {
  const st = only({ sort: so.value })
  const out = run(st).data
  const col = sortColumns(so.value, st.range)[0]
  const vals = out.map((r) => r[col.col])
  const firstNull = vals.findIndex((v) => v === null || v === undefined)
  const nullsLast = firstNull === -1 || vals.slice(firstNull).every((v) => v === null || v === undefined)
  const nonNull = vals.filter((v) => v !== null && v !== undefined)
  const ordered = nonNull.every((v, i) => i === 0 || (col.ascending ? String(nonNull[i - 1]) <= String(v) || Number(nonNull[i - 1]) <= Number(v) : Number(nonNull[i - 1]) >= Number(v) || String(nonNull[i - 1]) >= String(v)))
  check(`D1 sort ${so.value}: ordered, missing values last`, nullsLast && ordered && out.length === pub.length)
}
check("D2 unknown sort never reaches the query (allowlist)", sortColumns(p("sort=name;drop").state.sort, "30d")[0].col === "mrr")
// Ties: many rows with equal MRR must page without duplicates or gaps.
const ties = Array.from({ length: 30 }, (_, i) => row(`tie_${String(i).padStart(2, "0")}`, { mrr: 100000, published_at: "2026-10-01T00:00:00Z" }))
const seen: string[] = []
for (let page = 1; page <= 3; page++) seen.push(...ids({ ...DEFAULT_STATE, page, limit: 12 }, ties))
check("D3 stable tie-break: no duplicates or gaps across pages", seen.length === 30 && new Set(seen).size === 30)
check("D4 total count is taken after filters, before the page window", run({ ...sel, limit: 1 }).count === expected.length && run({ ...sel, limit: 1 }).data.length === 1)
check("D5 page past the end returns no rows but the real count", run({ ...sel, page: 9 }).data.length === 0 && run({ ...sel, page: 9 }).count === expected.length)
check("D6 search term is sanitised for PostgREST", (() => {
  let captured = ""
  const spy: any = new Proxy({}, { get: (_t, k) => (k === "or" ? (f: string) => ((captured = f), spy) : () => spy) })
  buildMarketQuery(spy, { ...DEFAULT_STATE, q: "a,b).or(id.eq.1" })
  return !captured.replace(/^name\.ilike\.\*|\*,pitch.*$/g, "").match(/[(),]/)
})())

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
