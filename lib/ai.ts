import "server-only"

import { claude, claudeJson, MODELS, type ChatTurn } from "./claude"
import { inr, inrShort, monthLabel, multiple, pct } from "./format"
import type { Flag, Interval, Label, Metrics } from "./metrics"
import { THRESHOLDS } from "./metrics"
import { allowedNumbers, checkNumbers } from "./numbercheck"

// ---------- Shared facts block (the ONLY numbers the AI may use) ----------

export type ListingFacts = {
  name: string
  category: string
  pitch: string
  asking_price_inr: number | null
}

export type TrafficFacts = { visitors_6m: number; revenue_per_visitor: number | null; source: string } | null

export function buildFacts(l: ListingFacts, m: Metrics, flags: Flag[], traffic: TrafficFacts = null): string {
  const lines: string[] = []
  lines.push(`Startup: ${l.name} (${l.category}). Pitch: ${l.pitch}`)
  lines.push(`Data source: Razorpay payments export, ${m.payment_count} payments, ${m.first_month ? monthLabel(m.first_month) : "?"} to ${m.latest_month ? monthLabel(m.latest_month) : "?"}.`)
  lines.push(`MRR (${m.latest_month ? monthLabel(m.latest_month) : "latest month"}): ${inr(m.mrr)} (${inrShort(m.mrr)})`)
  lines.push(`ARR (MRR x 12): ${inr(m.arr)} (${inrShort(m.arr)})`)
  lines.push(`Previous month MRR: ${inr(m.prev_mrr)}`)
  lines.push(`MoM MRR growth: ${m.growth_pct === null ? "not available" : pct(m.growth_pct, { sign: true })}`)
  lines.push(`Net revenue, last 6 months: ${inr(m.revenue_6m)} (${inrShort(m.revenue_6m)})`)
  lines.push(`Net revenue, all months in data: ${inr(m.revenue_total)}`)
  lines.push(`Recurring share of revenue (6 months): ${pct(m.recurring_share_pct)}`)
  lines.push(`Refunds as share of revenue (6 months): ${pct(m.refund_pct)}`)
  lines.push(`Paying customers (6 months): ${m.customers_6m}`)
  lines.push(`Largest customer share of revenue (6 months): ${pct(m.top_customer_pct)} (${inr(m.top_customer_revenue)})`)
  if (l.asking_price_inr) {
    lines.push(`Asking price: ${inr(l.asking_price_inr)} (${inrShort(l.asking_price_inr)})`)
    if (m.arr > 0) lines.push(`Asking price multiple of ARR: ${multiple(l.asking_price_inr / m.arr)}`)
  }
  lines.push("Monthly net revenue / MRR:")
  for (const r of m.monthly) lines.push(`- ${monthLabel(r.month)}: net revenue ${inr(r.net)}, MRR ${inr(r.mrr)}`)
  if (traffic) {
    lines.push(`Website visitors, last 6 months (${traffic.source}): ${traffic.visitors_6m.toLocaleString("en-IN")}`)
    if (traffic.revenue_per_visitor !== null) lines.push(`Revenue per visitor (6 months): ${inr(traffic.revenue_per_visitor, { decimals: 2 })}`)
  }
  lines.push(flags.length ? "Risk flags found by code:" : "Risk flags found by code: none")
  for (const f of flags) lines.push(`- ${f.title}`)
  lines.push("NOT verified by Kickoff yet: founder identity and company ownership (KYC), profit and expenses, revenue from other payment gateways, ITR / tax filings" + (traffic ? "." : ", website traffic."))
  return lines.join("\n")
}

const NUMBER_RULES = `Rules for numbers:
- Use ONLY numbers that appear in FACTS, written exactly as shown there (you may use the short form like ₹4.2L if FACTS shows it).
- Never calculate, estimate or round to new numbers. If a number isn't in FACTS, say the data doesn't show it.
- Write months in words, e.g. "September 2026".`

export function allowedFor(l: ListingFacts, m: Metrics, flags: Flag[], traffic: TrafficFacts = null) {
  const extra = [THRESHOLDS.concentrationPct, THRESHOLDS.spikeMultiple, THRESHOLDS.refundPct, THRESHOLDS.unclearPct]
  if (l.asking_price_inr) {
    extra.push(l.asking_price_inr)
    if (m.arr > 0) extra.push(Number((l.asking_price_inr / m.arr).toFixed(1)))
  }
  if (traffic) {
    extra.push(traffic.visitors_6m)
    if (traffic.revenue_per_visitor !== null) extra.push(traffic.revenue_per_visitor)
  }
  return allowedNumbers(m, flags, extra)
}

// ---------- 1. Payment labels ----------

export type LabelInput = {
  key: string
  description: string
  amount_inr: number
  customer_payments: number // how many payments this customer made in the file
  customer_same_amount: boolean // all of this customer's payments are the same amount
}

export type LabelOutput = { key: string; label: Label; interval: Interval; reason: string }

const LABEL_SYSTEM = `You classify payments from an Indian SaaS company's Razorpay export.
For each item return one label:
- "recurring": a subscription or renewal (monthly or yearly plan, seats, licence, retainer).
- "one_time": setup fees, onboarding, consulting, custom work, lifetime deals, one-off purchases.
- "refund": the description says it is a refund or chargeback.
- "unclear": you genuinely can't tell.
Also return "interval": "monthly" or "yearly" for recurring items (yearly if the text says annual/yearly/12 months), otherwise null.
Descriptions are messy: "Pro plan", "renewal - pro", "inv-2231", "pro plan ka renewal" (Hinglish), typos.
Use the customer pattern: a customer who pays the same amount many times is almost certainly a recurring subscriber, even if the description is only an invoice number. A single payment with only an invoice number is "unclear".
Reply with JSON only: [{"key": "...", "label": "...", "interval": "monthly"|"yearly"|null, "reason": "max 8 words"}]`

export async function labelPayments(items: LabelInput[]): Promise<LabelOutput[]> {
  const out: LabelOutput[] = []
  const BATCH = 60
  const batches: LabelInput[][] = []
  for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH))
  const results = await Promise.all(
    batches.map((batch) =>
      claudeJson<LabelOutput[]>({
        model: MODELS.fast,
        system: LABEL_SYSTEM,
        maxTokens: 4000,
        temperature: 0,
        messages: [{ role: "user", content: JSON.stringify(batch) }],
      })
    )
  )
  const valid: Label[] = ["recurring", "one_time", "refund", "unclear"]
  for (const r of results.flat()) {
    if (!r || typeof r.key !== "string") continue
    const label = valid.includes(r.label) ? r.label : "unclear"
    out.push({
      key: r.key,
      label,
      interval: label === "recurring" ? (r.interval === "yearly" ? "yearly" : "monthly") : null,
      reason: String(r.reason ?? "").slice(0, 80),
    })
  }
  return out
}

// ---------- 2. Flag explanations ----------

export type FlagExplanation = { title: string; explanation: string; buyer_question: string }

export async function explainFlags(l: ListingFacts, m: Metrics, flags: Flag[]): Promise<FlagExplanation[]> {
  if (!flags.length) return []
  const facts = buildFacts(l, m, flags)
  const allowed = allowedFor(l, m, flags)
  const ask = async () =>
    claudeJson<FlagExplanation[]>({
      system: `You help buyers understand risks in a small SaaS business they may acquire. Plain, calm English. No hype, no legal advice.
${NUMBER_RULES}
For each risk flag, write:
- "explanation": 1-2 short sentences on why this matters to a buyer.
- "buyer_question": one specific question the buyer should ask the founder.
Reply with JSON only: [{"title": "<exact flag title>", "explanation": "...", "buyer_question": "..."}]`,
      messages: [{ role: "user", content: `FACTS:\n${facts}\n\nFlags to explain:\n${flags.map((f) => `- ${f.title}`).join("\n")}` }],
      maxTokens: 1200,
    })
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ask()
    const text = res.map((r) => `${r.explanation} ${r.buyer_question}`).join(" ")
    if (checkNumbers(text, allowed).ok) return res
  }
  // Fall back to no explanation rather than showing unchecked numbers.
  return flags.map((f) => ({ title: f.title, explanation: "", buyer_question: "" }))
}

// ---------- 3. Listing writer ----------

export async function draftListing(l: ListingFacts, m: Metrics, flags: Flag[]): Promise<{ description: string; check: ReturnType<typeof checkNumbers> }> {
  const facts = buildFacts(l, m, flags)
  const allowed = allowedFor(l, m, flags)
  let last = { description: "", check: { ok: false, unknown: [] as string[], found: 0 } }
  for (let attempt = 0; attempt < 2; attempt++) {
    const description = await claude({
      system: `You write marketplace listings for founders selling a small SaaS business in India.
Write 2 short paragraphs (max 120 words total), honest and specific, in the founder's voice ("we").
Paragraph 1: what the product does and who pays for it. Paragraph 2: the verified traction (MRR, growth, customers).
Don't hide risk flags; if there is one, mention it briefly and neutrally. No hype words, no emojis, no headings.
${NUMBER_RULES}`,
      messages: [{ role: "user", content: `FACTS:\n${facts}` }],
      maxTokens: 600,
      temperature: 0.4,
    })
    const check = checkNumbers(description, allowed)
    last = { description: description.trim(), check }
    if (check.ok) return last
  }
  return last
}

// ---------- 4. Buyer summary ----------

export type BuyerSummary = { proven: string[]; missing: string[]; ask_next: string[] }

export async function buyerSummary(
  l: ListingFacts,
  m: Metrics,
  flags: Flag[],
  traffic: TrafficFacts = null
): Promise<{ summary: BuyerSummary | null; checked: boolean; unknown: string[] }> {
  const facts = buildFacts(l, m, flags, traffic)
  const allowed = allowedFor(l, m, flags, traffic)
  let unknown: string[] = []
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await claudeJson<BuyerSummary>({
      system: `You brief a buyer who is considering acquiring a small Indian SaaS business on Kickoff.
Return JSON only: {"proven": [...], "missing": [...], "ask_next": [...]}
- "proven": 3-5 short bullets of what the verified payment data shows.
- "missing": 2-4 bullets of what is NOT verified (use the NOT verified list and any data gaps).
- "ask_next": 3 specific questions to ask the founder, prioritising risk flags.
Each bullet max 20 words. Plain English.
${NUMBER_RULES}`,
      messages: [{ role: "user", content: `FACTS:\n${facts}` }],
      maxTokens: 900,
    })
    const text = [...(s.proven ?? []), ...(s.missing ?? []), ...(s.ask_next ?? [])].join(" ")
    const check = checkNumbers(text, allowed)
    if (check.ok) return { summary: s, checked: true, unknown: [] }
    unknown = check.unknown
  }
  return { summary: null, checked: false, unknown }
}

// ---------- 5. Buyer chat ----------

export async function answerBuyer(
  l: ListingFacts,
  m: Metrics,
  flags: Flag[],
  traffic: TrafficFacts,
  description: string | null,
  history: ChatTurn[]
): Promise<{ answer: string; checked: boolean }> {
  const facts = buildFacts(l, m, flags, traffic)
  const allowed = allowedFor(l, m, flags, traffic)
  const system = `You are Kickoff's assistant on the listing page of "${l.name}". Answer the buyer's questions using ONLY the FACTS and the founder's description below.
If the answer isn't in the data, say plainly that Kickoff's verified data doesn't show it, and suggest what to ask the founder.
Keep answers under 90 words. No investment, legal or tax advice; you can point out what to check.
${NUMBER_RULES}

FACTS:
${facts}

Founder's description (written by the founder, not verified):
${description ?? "(none)"}`
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = (await claude({ system, messages: history.slice(-10), maxTokens: 400 })).trim()
    if (checkNumbers(answer, allowed).ok) return { answer, checked: true }
  }
  return {
    answer: "I couldn't answer that using only verified numbers. Try asking about MRR, growth, customers, refunds or the risk flags, or ask the founder directly.",
    checked: false,
  }
}
