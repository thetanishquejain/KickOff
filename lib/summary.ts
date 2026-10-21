import "server-only"
import { createClient } from "@/db/supabase/server"

import { buyerSummary, type BuyerSummary } from "./ai"
import { claudeConfigured } from "./claude"
import { trafficFacts, type ListingFull } from "./data"
import type { Flag } from "./metrics"
import { adminClient } from "./supabase-admin"

export type SummaryState =
  | { status: "ok"; summary: BuyerSummary }
  | { status: "under_review" }
  | { status: "unavailable"; reason: string }

export async function getOrCreateSummary(l: ListingFull): Promise<SummaryState> {
  if (!l.metrics) return { status: "unavailable", reason: "This listing has no verified payment data yet." }
  const db = createClient()
  const { data: existing } = await db
    .from("summaries")
    .select("content, checked, status, metrics_computed_at")
    .eq("listing_id", l.id)
    .maybeSingle()
  const fresh = existing && existing.metrics_computed_at === l.computed_at
  if (fresh) {
    if (existing.status === "under_review" || !existing.checked) return { status: "under_review" }
    return { status: "ok", summary: existing.content as BuyerSummary }
  }
  if (!claudeConfigured()) return { status: "unavailable", reason: "AI summary isn't switched on for this site yet." }

  const flags: Flag[] = l.flags.map((f) => ({ type: f.type as Flag["type"], title: f.title, detail: f.detail }))
  const res = await buyerSummary(
    { name: l.name, category: l.category, pitch: l.pitch, asking_price_inr: l.asking_price_inr },
    l.metrics,
    flags,
    trafficFacts(l)
  )
  const admin = adminClient()
  if (admin) {
    await admin.from("summaries").upsert({
      listing_id: l.id,
      content: res.summary,
      checked: res.checked,
      status: res.checked ? "ok" : "under_review",
      metrics_computed_at: l.computed_at,
    })
  }
  return res.checked && res.summary ? { status: "ok", summary: res.summary } : { status: "under_review" }
}
