import "server-only"
import { createClient } from "@/db/supabase/server"

import type { Metrics, Range } from "./metrics"
import { rangeWindow, revenueInRange } from "./metrics"
import type { Insights } from "./insights"
import { MemoryQuery } from "./market-memory"
import { buildMarketQuery, isForSale, type MarketState } from "./market-query"

export type ListingRow = {
  id: string
  founder_id: string
  name: string
  category: string
  pitch: string
  description: string | null
  website: string | null
  asking_price_inr: number | null
  status: "draft" | "published"
  is_demo: boolean
  verified_at: string | null
  created_at: string
  founded_on?: string | null
  insights?: Insights | null
  is_for_sale?: boolean
  data_source?: string | null
  business_model?: "b2b" | "b2c" | "b2b2c" | null
  published_at?: string | null
}

export type FlagRow = {
  id: string
  type: string
  title: string
  detail: Record<string, number | string>
  ai_explanation: string | null
  buyer_question: string | null
}

export type TrafficDay = { date: string; active_users: number; sessions: number; is_demo: boolean }

export type ListingFull = ListingRow & {
  founder_name: string | null
  metrics: Metrics | null
  computed_at: string | null
  flags: FlagRow[]
  traffic: TrafficDay[]
  ga: { property_id: string; last_synced_at: string | null } | null
}

export const CATEGORIES = [
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
]

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

function normalizeListing(l: any): ListingRow {
  return { ...l, asking_price_inr: num(l.asking_price_inr) }
}

export async function getPublishedListings(): Promise<ListingFull[]> {
  const db = createClient()
  const { data: listings } = await db
    .from("listings")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
  return hydrate((listings ?? []).map(normalizeListing))
}

export async function getListing(id: string): Promise<ListingFull | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db = createClient()
  const { data } = await db.from("listings").select("*").eq("id", id).maybeSingle()
  if (!data) return null
  const [full] = await hydrate([normalizeListing(data)], { withGa: true })
  return full ?? null
}

export async function getFounderListings(founderId: string): Promise<ListingFull[]> {
  const db = createClient()
  const { data } = await db.from("listings").select("*").eq("founder_id", founderId).order("created_at", { ascending: false })
  return hydrate((data ?? []).map(normalizeListing))
}

export async function hydrate(listings: ListingRow[], opts?: { withGa?: boolean }): Promise<ListingFull[]> {
  if (!listings.length) return []
  const db = createClient()
  const ids = listings.map((l) => l.id)
  const founderIds = [...new Set(listings.map((l) => l.founder_id))]
  const [metricsRes, flagsRes, profilesRes, trafficRes, gaRes] = await Promise.all([
    db.from("metrics").select("listing_id, data, computed_at").in("listing_id", ids),
    db.from("flags").select("id, listing_id, type, title, detail, ai_explanation, buyer_question").in("listing_id", ids),
    db.from("profiles").select("id, full_name").in("id", founderIds),
    db.from("traffic_daily").select("listing_id, date, active_users, sessions, is_demo").in("listing_id", ids).order("date"),
    opts?.withGa
      ? db.from("ga_connections").select("listing_id, property_id, last_synced_at").in("listing_id", ids)
      : Promise.resolve({ data: [] as any[] }),
  ])
  return listings.map((l) => {
    const m = metricsRes.data?.find((r) => r.listing_id === l.id)
    const ga = gaRes.data?.find((r: any) => r.listing_id === l.id)
    return {
      ...l,
      founder_name: profilesRes.data?.find((p) => p.id === l.founder_id)?.full_name ?? null,
      metrics: m?.data && (m.data as any).monthly ? (m.data as Metrics) : null,
      computed_at: m?.computed_at ?? null,
      flags: (flagsRes.data ?? []).filter((f) => f.listing_id === l.id) as FlagRow[],
      traffic: (trafficRes.data ?? []).filter((t) => t.listing_id === l.id) as TrafficDay[],
      ga: ga ? { property_id: ga.property_id, last_synced_at: ga.last_synced_at } : null,
    }
  })
}

// ---- Derived numbers used by cards, leaderboard and AI ----

export function trafficInWindow(traffic: TrafficDay[], from: string, to: string): number | null {
  if (!traffic.length) return null
  const rows = traffic.filter((t) => t.date >= from && t.date <= to)
  if (!rows.length) return null
  return rows.reduce((s, t) => s + t.active_users, 0)
}

export function rangeStats(l: ListingFull, range: Range) {
  const m = l.metrics
  if (!m) return { revenue: 0, visitors: null as number | null, perVisitor: null as number | null }
  const revenue = revenueInRange(m, range)
  const w = rangeWindow(m, range)
  const visitors = w ? trafficInWindow(l.traffic, w.from, w.to) : null
  return {
    revenue,
    visitors,
    perVisitor: visitors && visitors > 0 ? Math.round((revenue / visitors) * 100) / 100 : null,
  }
}

export function askingMultiple(l: ListingFull): number | null {
  if (!l.asking_price_inr || !l.metrics || l.metrics.arr <= 0) return null
  return Math.round((l.asking_price_inr / l.metrics.arr) * 10) / 10
}

export function trafficFacts(l: ListingFull) {
  if (!l.metrics) return null
  const s = rangeStats(l, "6m")
  if (s.visitors === null) return null
  const demo = l.traffic.some((t) => t.is_demo)
  return {
    visitors_6m: s.visitors,
    revenue_per_visitor: s.perVisitor,
    source: demo ? "demo data" : "Google Analytics",
  }
}

// ---- Founder updates ----

export type Post = {
  id: string
  listing_id: string
  body: string
  created_at: string
  author_id: string
  author_name: string | null
  listing_name: string
  listing_category: string
  is_demo: boolean
  likes: number
  liked: boolean
}

/** Latest founder updates. Returns [] if the posts table isn't there yet, so pages never break on it. */
export async function getPosts(opts: { listingId?: string; limit?: number; viewerId?: string | null } = {}): Promise<Post[]> {
  const db = createClient()
  let q = db.from("posts").select("id, listing_id, author_id, body, created_at").order("created_at", { ascending: false }).limit(opts.limit ?? 30)
  if (opts.listingId) q = q.eq("listing_id", opts.listingId)
  const { data: posts, error } = await q
  if (error || !posts?.length) return []
  const listingIds = [...new Set(posts.map((p) => p.listing_id))]
  const authorIds = [...new Set(posts.map((p) => p.author_id))]
  const postIds = posts.map((p) => p.id)
  const [ls, ps, likes] = await Promise.all([
    db.from("listings").select("id, name, category, is_demo").in("id", listingIds),
    db.from("profiles").select("id, full_name").in("id", authorIds),
    db.from("post_likes").select("post_id, user_id").in("post_id", postIds),
  ])
  return posts.flatMap((p) => {
    const l = ls.data?.find((x) => x.id === p.listing_id)
    if (!l) return []
    const pl = (likes.data ?? []).filter((x) => x.post_id === p.id)
    return [
      {
        ...p,
        author_name: ps.data?.find((x) => x.id === p.author_id)?.full_name ?? null,
        listing_name: l.name,
        listing_category: l.category,
        is_demo: l.is_demo,
        likes: pl.length,
        liked: Boolean(opts.viewerId && pl.some((x) => x.user_id === opts.viewerId)),
      },
    ]
  })
}

// ---- Marketplace (filters, sort and pagination run in the database) ----


export type MarketResult = { listings: ListingFull[]; total: number; error: string | null; source: "database" | "fallback" }

export async function queryMarketplace(s: MarketState): Promise<MarketResult> {
  const db = createClient()
  const base = db.from("marketplace_listings").select("id", { count: "exact" })
  const { data, count, error } = await (buildMarketQuery(base as any, s) as any)
  if (error) {
    // The view arrives with migration 20261022040000. Until it is applied, run the same
    // query on the server against published listings so the page keeps working.
    if (/marketplace_listings|does not exist|schema cache/i.test(error.message)) return fallbackMarketplace(s)
    return { listings: [], total: 0, error: error.message, source: "database" }
  }
  const ids: string[] = (data ?? []).map((r: { id: string }) => r.id)
  if (!ids.length) return { listings: [], total: count ?? 0, error: null, source: "database" }
  const { data: rows, error: e2 } = await db.from("listings").select("*").in("id", ids)
  if (e2) return { listings: [], total: 0, error: e2.message, source: "database" }
  const full = await hydrate((rows ?? []).map(normalizeListing))
  const byId = new Map(full.map((l) => [l.id, l]))
  return { listings: ids.map((id) => byId.get(id)).filter(Boolean) as ListingFull[], total: count ?? ids.length, error: null, source: "database" }
}

/** Same columns as the marketplace view, built from a hydrated listing. */
export function toMarketRow(l: ListingFull) {
  const m = l.metrics
  const s30 = rangeStats(l, "30d")
  const s6 = rangeStats(l, "6m")
  const sAll = rangeStats(l, "all")
  return {
    id: l.id,
    name: l.name,
    pitch: l.pitch,
    category: l.category,
    status: l.status,
    is_for_sale: isForSale(l),
    business_model: l.business_model ?? null,
    asking_price_inr: l.asking_price_inr,
    mrr: m ? m.mrr : null,
    arr: m ? m.arr : null,
    growth_pct: m ? m.growth_pct : null,
    arr_multiple: m && m.arr > 0 && l.asking_price_inr !== null ? Math.round((l.asking_price_inr / m.arr) * 100) / 100 : null,
    flag_count: l.flags.length,
    revenue_30d: m ? s30.revenue : null,
    revenue_6m: m ? m.revenue_6m : null,
    revenue_all: m ? sAll.revenue : null,
    rpv_30d: s30.perVisitor,
    rpv_6m: s6.perVisitor,
    rpv_all: sAll.perVisitor,
    published_at: l.published_at ?? l.created_at,
    computed_at: l.computed_at,
    is_demo: l.is_demo,
  }
}

async function fallbackMarketplace(s: MarketState): Promise<MarketResult> {
  const all = await getPublishedListings()
  const byId = new Map(all.map((l) => [l.id, l]))
  const { data, count } = buildMarketQuery(new MemoryQuery(all.map(toMarketRow)), s).run()
  return { listings: data.map((r) => byId.get(r.id as string)!), total: count, error: null, source: "fallback" }
}

/** Published listing count per category, for the filter panel. */
export async function categoryCounts(): Promise<Record<string, number>> {
  const db = createClient()
  const { data } = await db.from("listings").select("category").eq("status", "published")
  const out: Record<string, number> = {}
  for (const r of data ?? []) out[r.category] = (out[r.category] ?? 0) + 1
  return out
}

/** "verified_test" | "rejected" | null. Only the status is exposed, never KYC details. */
export async function kycStatus(userId: string): Promise<string | null> {
  const db = createClient()
  const { data, error } = await db.rpc("kyc_status", { uid: userId })
  return error ? null : ((data as string | null) ?? null)
}
