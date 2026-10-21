// Checks the metrics engine against the planted problems.
// Run: pnpm test:metrics
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { parseRazorpayCsv } from "../lib/csv"
import { ruleLabel } from "../lib/labels"
import { computeFlags, computeMetrics, revenueInRange, type PaymentRow } from "../lib/metrics"
import { allowedNumbers, checkNumbers } from "../lib/numbercheck"

const DIR = join(process.cwd(), "test-data")
const cases: { file: string; expect: string[]; notExpect: string[] }[] = [
  { file: "a_healthy", expect: [], notExpect: ["concentration", "spike", "refunds"] },
  { file: "b_concentration", expect: ["concentration"], notExpect: ["spike"] },
  { file: "c_inflated", expect: ["spike"], notExpect: ["concentration"] },
  { file: "d_small", expect: [], notExpect: ["concentration", "spike"] },
]

let failed = 0
for (const c of cases) {
  const parsed = parseRazorpayCsv(readFileSync(join(DIR, `${c.file}.csv`), "utf8"))
  const truth = JSON.parse(readFileSync(join(DIR, `${c.file}.truth.json`), "utf8"))
  const byCust = new Map<string, number[]>()
  for (const p of parsed.payments) byCust.set(p.customer_key ?? p.payment_id, [...(byCust.get(p.customer_key ?? p.payment_id) ?? []), p.amount_inr])
  const rows: PaymentRow[] = parsed.payments.map((p) => {
    const amounts = byCust.get(p.customer_key ?? p.payment_id)!
    const l = ruleLabel(p.description, p.status, { customer_payments: amounts.length, customer_same_amount: amounts.every((a) => a === amounts[0]) })
    return { ...p, label: l.label, interval: l.interval }
  })
  const considered = rows.filter((r) => r.status !== "failed" && r.status !== "refunded")
  const correct = considered.filter((r) => truth[r.payment_id]?.label === r.label).length
  const m = computeMetrics(rows)
  const flags = computeFlags(m)
  const types: string[] = flags.map((f) => f.type)
  const missing = c.expect.filter((t) => !types.includes(t))
  const wrong = c.notExpect.filter((t) => types.includes(t))
  const ok = !missing.length && !wrong.length
  if (!ok) failed++
  console.log(
    `${ok ? "PASS" : "FAIL"} ${c.file}: MRR ₹${m.mrr} | 6m ₹${m.revenue_6m} | growth ${m.growth_pct}% | top ${m.top_customer_pct}% | refunds ${m.refund_pct}% | flags [${types.join(", ")}] | rule labels ${correct}/${considered.length}`
  )
  if (missing.length) console.log("   missing flags:", missing)
  if (wrong.length) console.log("   unexpected flags:", wrong)
}

// Number check sanity
{
  const parsed = parseRazorpayCsv(readFileSync(join(DIR, "b_concentration.csv"), "utf8"))
  const rows = parsed.payments.map((p) => ({ ...p, ...ruleLabel(p.description, p.status) }))
  const m = computeMetrics(rows)
  const flags = computeFlags(m)
  const allowed = allowedNumbers(m, flags, [30, 2, 10])
  const good = `MRR is ₹${m.mrr.toLocaleString("en-IN")} and one customer is ${Math.round(m.top_customer_pct)}% of revenue in September 2026.`
  const bad = `MRR is ₹9,99,999 and growth is 85%.`
  const g = checkNumbers(good, allowed)
  const b = checkNumbers(bad, allowed)
  const ok = g.ok && !b.ok
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"} number check: good text ok=${g.ok} ${g.unknown}, invented text blocked=${!b.ok} (${b.unknown.join(", ")})`)
}

// "Last 30 days" must equal the latest month when the latest month has 30 days (Sept 2026)
{
  const parsed = parseRazorpayCsv(readFileSync(join(DIR, "c_inflated.csv"), "utf8"))
  const rows = parsed.payments.map((p) => ({ ...p, ...ruleLabel(p.description, p.status) }))
  const m = computeMetrics(rows)
  const d30 = revenueInRange(m, "30d")
  const last = m.monthly[m.monthly.length - 1].net
  const ok = Math.abs(d30 - last) < 1 && revenueInRange(m, "all") === m.revenue_total
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"} 30-day range: ₹${d30} vs September ₹${last}`)
}

process.exit(failed ? 1 : 0)
