// Blocks AI text that contains numbers not backed by calculated metrics.

import type { Flag, Metrics } from "./metrics"

export type NumberCheck = { ok: boolean; unknown: string[]; found: number }

/** Every number the AI is allowed to use, from metrics and flags. */
export function allowedNumbers(m: Metrics, flags: Flag[], extra: number[] = []): number[] {
  const vals: number[] = [
    m.mrr,
    m.arr,
    m.prev_mrr,
    m.growth_pct ?? 0,
    Math.abs(m.growth_pct ?? 0),
    m.revenue_last_month,
    m.revenue_6m,
    m.revenue_total,
    m.refund_pct,
    m.top_customer_pct,
    m.top_customer_revenue,
    m.customers_6m,
    m.recurring_share_pct,
    m.unclear_pct,
    m.payment_count,
    m.monthly.length,
    ...m.monthly.flatMap((r) => [r.net, r.mrr, r.gross, r.refunds, r.recurring]),
    ...extra,
  ]
  for (const f of flags) for (const v of Object.values(f.detail)) if (typeof v === "number") vals.push(v)
  return vals.filter((v) => Number.isFinite(v))
}

const UNIT: Record<string, number> = { k: 1e3, l: 1e5, lakh: 1e5, lakhs: 1e5, lac: 1e5, cr: 1e7, crore: 1e7, crores: 1e7 }

/** Pull numbers out of text, expanding ₹4.2L / 1.5 crore / 42K forms. */
export function extractNumbers(text: string): { raw: string; value: number; isPct: boolean }[] {
  const out: { raw: string; value: number; isPct: boolean }[] = []
  // Skip dates like 2026-09 / Sep 2026 years and list markers.
  const cleaned = text.replace(/\b(19|20)\d{2}-\d{2}(-\d{2})?\b/g, " ").replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(
      /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b\.?\s*'?\d{1,2}\b/gi,
      " "
    )
  const re = /(₹|rs\.?\s?|inr\s?)?(-?\d[\d,]*(?:\.\d+)?)\s*(%|x\b|k\b|l\b|lakhs?\b|lac\b|cr\b|crores?\b)?/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(cleaned))) {
    const [raw, , numStr, unitRaw] = match
    const n = Number(numStr.replace(/,/g, ""))
    if (!Number.isFinite(n)) continue
    const unit = unitRaw?.toLowerCase()
    const isPct = unit === "%"
    const value = unit && UNIT[unit] ? n * UNIT[unit] : n
    out.push({ raw: raw.trim(), value, isPct })
  }
  return out
}

function close(a: number, b: number, isPct: boolean): boolean {
  if (isPct) return Math.abs(a - b) <= 1
  const tol = Math.max(1, Math.abs(b) * 0.02) // 2% rounding, e.g. ₹4.24L vs ₹4,23,800
  return Math.abs(a - b) <= tol
}

export function checkNumbers(text: string, allowed: number[]): NumberCheck {
  const nums = extractNumbers(text)
  const unknown: string[] = []
  for (const n of nums) {
    // Small whole numbers (counts like "3 months", "2 questions") are allowed.
    if (!n.isPct && Number.isInteger(n.value) && n.value >= 0 && n.value <= 12) continue
    const ok = allowed.some((a) => close(n.value, a, n.isPct) || close(n.value, Math.abs(a), n.isPct))
    if (!ok) unknown.push(n.raw)
  }
  return { ok: unknown.length === 0, unknown, found: nums.length }
}
