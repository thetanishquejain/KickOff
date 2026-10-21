// Generates Razorpay-style payment CSVs with planted problems.
// Run: node test-data/generate.mjs
// Amounts are in paise, like the real Razorpay export.

import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = dirname(fileURLToPath(import.meta.url))
const MONTHS = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function makeWriter(seed, prefix) {
  const rand = rng(seed)
  const rows = []
  let n = 0
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const day = (month) => {
    const d = 1 + Math.floor(rand() * 28)
    const h = 9 + Math.floor(rand() * 11)
    const m = Math.floor(rand() * 60)
    return `${month}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
  }
  const add = ({ month, rupees, desc, customer, status = "captured", method, truth = "one_time", interval = null }) => {
    n++
    rows.push({
      truth,
      interval,
      id: `pay_${prefix}${String(n).padStart(5, "0")}`,
      created_at: day(month),
      amount: Math.round(rupees * 100),
      currency: "INR",
      status,
      method: method ?? pick(["upi", "upi", "card", "netbanking", "upi"]),
      email: `${customer.id.replace("cust_", "")}@${customer.domain}`,
      contact: customer.phone,
      description: desc,
      customer_id: customer.id,
    })
  }
  const customer = (i, domain = "example.in") => ({
    id: `cust_${prefix}${String(i).padStart(4, "0")}`,
    domain,
    phone: `+9198${String(10000000 + i * 7919).slice(0, 8)}`,
  })
  return { rows, add, pick, rand, customer }
}

const PLAN_TEXT = {
  starter: ["Starter plan", "Starter monthly", "renewal - starter", "Monthly subscription Starter", "starter plan ka renewal"],
  pro: ["Pro plan", "Pro plan renewal", "renewal - pro", "PRO monthly", "pro plan ka renewal", "Subscription: Pro"],
  team: ["Team plan", "Team plan renewal", "team seats renewal", "Team monthly subscription"],
}
const PRICES = { starter: 999, pro: 2499, team: 7999 }

function subscriptions(w, { startCustomers, growthPerMonth, churn, mix, yearlyShare = 0.08, startIndex = 1 }) {
  const active = []
  let idx = startIndex
  const newCust = () => {
    const r = w.rand()
    const plan = r < mix.starter ? "starter" : r < mix.starter + mix.pro ? "pro" : "team"
    const yearly = plan === "pro" && w.rand() < yearlyShare
    return { c: w.customer(idx++), plan, yearly, joined: null }
  }
  for (let i = 0; i < startCustomers; i++) active.push(newCust())
  MONTHS.forEach((month, mi) => {
    if (mi > 0) {
      for (let i = 0; i < growthPerMonth; i++) active.push(newCust())
    }
    for (const s of [...active]) {
      if (mi > 0 && w.rand() < churn) {
        active.splice(active.indexOf(s), 1)
        continue
      }
      if (s.yearly) {
        if (s.joined === null) {
          s.joined = month
          w.add({ month, rupees: 24999, desc: w.pick(["Annual plan Pro", "Pro yearly", "pro - 12 months", "Pro annual subscription"]), customer: s.c, truth: "recurring", interval: "yearly" })
        }
        continue
      }
      s.joined ??= month
      const desc = w.rand() < 0.12 ? `inv-${2000 + Math.floor(w.rand() * 900)}` : w.pick(PLAN_TEXT[s.plan])
      w.add({ month, rupees: PRICES[s.plan], desc, customer: s.c, truth: "recurring", interval: "monthly" })
    }
  })
  return idx
}

function oneTimes(w, { perMonth, startIndex }) {
  let idx = startIndex
  MONTHS.forEach((month) => {
    for (let i = 0; i < perMonth; i++) {
      const [rupees, desc] = w.pick([
        [4999, "Setup fee"],
        [4999, "onboarding fee one time"],
        [9999, "Custom report"],
        [2999, "consulting call 1hr"],
        [4999, "setup charges"],
      ])
      w.add({ month, rupees, desc, customer: w.customer(idx++) })
    }
  })
  return idx
}

function refunds(w, count) {
  // Mark some captured payments as refunded (Razorpay keeps them with status=refunded).
  const candidates = w.rows.filter((r) => r.status === "captured" && r.amount <= 1000000)
  for (let i = 0; i < count && candidates.length; i++) {
    const r = candidates.splice(Math.floor(w.rand() * candidates.length), 1)[0]
    r.status = "refunded"
  }
}

function addNoise(w) {
  // A few failed attempts that must be ignored.
  for (let i = 0; i < 6; i++) {
    const c = w.customer(9000 + i)
    w.add({ month: w.pick(MONTHS), rupees: 2499, desc: "Pro plan", customer: c, status: "failed", truth: "recurring", interval: "monthly" })
  }
}

function writeOut(name, rows) {
  writeFileSync(join(OUT, `${name}.csv`), toCsv(rows))
  const truth = Object.fromEntries(rows.map((r) => [r.id, { label: r.truth, interval: r.interval }]))
  writeFileSync(join(OUT, `${name}.truth.json`), JSON.stringify(truth, null, 0))
}

function toCsv(rows) {
  const cols = ["id", "created_at", "amount", "currency", "status", "method", "email", "contact", "description", "customer_id"]
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n"
}

// A: healthy, steady growth, low refunds
{
  const w = makeWriter(11, "A")
  const next = subscriptions(w, { startCustomers: 28, growthPerMonth: 7, churn: 0.03, mix: { starter: 0.45, pro: 0.45 } })
  oneTimes(w, { perMonth: 2, startIndex: next })
  refunds(w, 4)
  addNoise(w)
  writeOut("a_healthy", w.rows)
}

// B: one enterprise customer ≈ 60% of revenue
{
  const w = makeWriter(22, "B")
  const next = subscriptions(w, { startCustomers: 14, growthPerMonth: 3, churn: 0.04, mix: { starter: 0.4, pro: 0.5 } })
  const ent = { id: "cust_Bent0001", domain: "acmelogistics.in", phone: "+919800000001" }
  MONTHS.forEach((month) => {
    w.add({ month, rupees: 98000, desc: w.pick(["Enterprise license - Acme Logistics", "Acme enterprise renewal", "Enterprise plan (custom)"]), customer: ent, method: "netbanking", truth: "recurring", interval: "monthly" })
  })
  oneTimes(w, { perMonth: 1, startIndex: next })
  refunds(w, 2)
  addNoise(w)
  writeOut("b_concentration", w.rows)
}

// C: last month inflated ≈ 3x the previous 3-month average (lifetime-deal burst)
{
  const w = makeWriter(33, "C")
  let next = subscriptions(w, { startCustomers: 30, growthPerMonth: 4, churn: 0.04, mix: { starter: 0.5, pro: 0.42 } })
  next = oneTimes(w, { perMonth: 2, startIndex: next })
  for (let i = 0; i < 30; i++) {
    w.add({ month: "2026-09", rupees: 4999, desc: w.pick(["Lifetime deal", "LTD - launch week", "lifetime access offer", "one time lifetime plan"]), customer: w.customer(next++) })
  }
  refunds(w, 5)
  addNoise(w)
  writeOut("c_inflated", w.rows)
}

// D: smaller healthy startup, used for a demo listing
{
  const w = makeWriter(44, "D")
  const next = subscriptions(w, { startCustomers: 12, growthPerMonth: 4, churn: 0.05, mix: { starter: 0.6, pro: 0.35 } })
  oneTimes(w, { perMonth: 1, startIndex: next })
  refunds(w, 2)
  addNoise(w)
  writeOut("d_small", w.rows)
}

console.log("Wrote a_healthy.csv, b_concentration.csv, c_inflated.csv, d_small.csv")
