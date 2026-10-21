import "server-only"

import { explainFlags } from "./ai"
import { claudeConfigured } from "./claude"
import type { ListingFull } from "./data"
import type { Flag } from "./metrics"
import { adminClient } from "./supabase-admin"

/** Fill in missing AI explanations for a listing's flags (e.g. seeded demo listings). */
export async function ensureFlagExplanations(l: ListingFull): Promise<ListingFull> {
  if (!l.metrics || !claudeConfigured()) return l
  const missing = l.flags.filter((f) => !f.ai_explanation)
  if (!missing.length) return l
  const admin = adminClient()
  if (!admin) return l
  try {
    const flags: Flag[] = l.flags.map((f) => ({ type: f.type as Flag["type"], title: f.title, detail: f.detail }))
    const out = await explainFlags(
      { name: l.name, category: l.category, pitch: l.pitch, asking_price_inr: l.asking_price_inr },
      l.metrics,
      flags
    )
    const updated = await Promise.all(
      l.flags.map(async (f, i) => {
        const e = out.find((x) => x.title === f.title) ?? out[i]
        if (!e?.explanation || f.ai_explanation) return f
        await admin.from("flags").update({ ai_explanation: e.explanation, buyer_question: e.buyer_question }).eq("id", f.id)
        return { ...f, ai_explanation: e.explanation, buyer_question: e.buyer_question }
      })
    )
    return { ...l, flags: updated }
  } catch {
    return l
  }
}
