// Razorpay payments CSV parser.
// Expected columns (Razorpay "Payments" export):
// id, created_at, amount, currency, status, method, email, contact, description, customer_id
// `amount` is in paise. Extra columns are ignored; column order doesn't matter.

export type ParsedPayment = {
  payment_id: string
  paid_at: string // ISO
  amount_inr: number
  currency: string
  status: string // captured | refunded | failed | ...
  method: string | null
  customer_key: string | null
  description: string
}

export type ParseStats = {
  rows: number // data rows in the file
  imported: number
  duplicates: number // repeated payment id
  invalid: number // missing id, bad date or bad amount
  nonInr: number
  failed: number // imported, but status failed/created: never counted as revenue
  refunded: number
  firstDate: string | null
  lastDate: string | null
}

export type ParseResult = {
  payments: ParsedPayment[]
  skipped: number
  errors: string[]
  stats: ParseStats
}

const REQUIRED = ["id", "created_at", "amount", "status"]

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  const s = text.replace(/^﻿/, "")
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((f) => f.trim() !== "")) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f.trim() !== "")) rows.push(row)
  return rows
}

function toIso(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  // unix seconds
  if (/^\d{9,10}$/.test(t)) return new Date(Number(t) * 1000).toISOString()
  // dd/mm/yyyy [hh:mm[:ss]]
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (dmy) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = dmy
    return new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss)).toISOString()
  }
  const d = new Date(t.includes("T") || t.includes("Z") ? t : t.replace(" ", "T"))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function parseRazorpayCsv(text: string, opts?: { maxRows?: number }): ParseResult {
  const rows = parseCsvRows(text)
  const errors: string[] = []
  const empty: ParseStats = { rows: Math.max(0, rows.length - 1), imported: 0, duplicates: 0, invalid: 0, nonInr: 0, failed: 0, refunded: 0, firstDate: null, lastDate: null }
  if (rows.length < 2) return { payments: [], skipped: 0, errors: ["The file has no payment rows."], stats: empty }
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const missing = REQUIRED.filter((r) => !header.includes(r))
  if (missing.length) {
    return {
      payments: [],
      skipped: 0,
      errors: [`Missing column(s): ${missing.join(", ")}. Upload the Razorpay payments export.`],
      stats: empty,
    }
  }
  const col = (name: string) => header.indexOf(name)
  const idx = {
    id: col("id"),
    created_at: col("created_at"),
    amount: col("amount"),
    currency: col("currency"),
    status: col("status"),
    method: col("method"),
    email: col("email"),
    contact: col("contact"),
    description: col("description"),
    customer_id: col("customer_id"),
  }
  const max = opts?.maxRows ?? 5000
  const payments: ParsedPayment[] = []
  const seen = new Set<string>()
  let skipped = 0
  const stats = { ...empty }
  for (const r of rows.slice(1, max + 1)) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "")
    const id = get(idx.id)
    const paidAt = toIso(get(idx.created_at))
    const paise = Number(get(idx.amount).replace(/,/g, ""))
    if (id && seen.has(id)) {
      skipped++
      stats.duplicates++
      continue
    }
    if (!id || !paidAt || !Number.isFinite(paise) || paise < 0) {
      skipped++
      stats.invalid++
      continue
    }
    seen.add(id)
    const currency = (get(idx.currency) || "INR").toUpperCase()
    if (currency !== "INR") {
      skipped++
      stats.nonInr++
      continue
    }
    const customer =
      get(idx.customer_id) || get(idx.email).toLowerCase() || get(idx.contact) || null
    payments.push({
      payment_id: id,
      paid_at: paidAt,
      amount_inr: Math.round(paise) / 100,
      currency,
      status: get(idx.status).toLowerCase() || "captured",
      method: get(idx.method) || null,
      customer_key: customer,
      description: get(idx.description),
    })
  }
  if (rows.length - 1 > max) errors.push(`Only the first ${max} rows were read.`)
  stats.imported = payments.length
  stats.failed = payments.filter((p) => p.status !== "captured" && p.status !== "refunded").length
  stats.refunded = payments.filter((p) => p.status === "refunded").length
  const dates = payments.map((p) => p.paid_at).sort()
  stats.firstDate = dates[0] ?? null
  stats.lastDate = dates[dates.length - 1] ?? null
  return { payments, skipped, errors, stats }
}
