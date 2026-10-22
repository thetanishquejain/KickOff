"use server"

import type { ParseStats } from "@/lib/csv"

import { uploadPayments } from "./actions"

type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

type RzpPayment = {
  id: string
  amount: number // paise
  currency: string
  status: string
  method?: string | null
  email?: string | null
  contact?: string | null
  description?: string | null
  customer_id?: string | null
  created_at: number // unix seconds
  amount_refunded?: number
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Pull payments straight from the Razorpay Payments API with the founder's TEST keys and run them
 * through the same pipeline as a CSV upload (validation, duplicate checks, hashing, labels, metrics).
 * The key secret is used for this request only. It is never stored or logged.
 */
export async function importFromRazorpay(
  listingId: string,
  keyId: string,
  keySecret: string,
  months = 12
): Promise<Result<{ count: number; skipped: number; warnings: string[]; stats: ParseStats; fetched: number }>> {
  const id = keyId.trim()
  const secret = keySecret.trim()
  if (!/^rzp_test_[A-Za-z0-9]{6,}$/.test(id)) {
    return { ok: false, error: "Use a Razorpay TEST Key ID (it starts with rzp_test_). Live keys aren't supported yet." }
  }
  if (secret.length < 10 || secret.length > 100) return { ok: false, error: "Paste the Key Secret shown next to your test Key ID." }

  const auth = "Basic " + Buffer.from(`${id}:${secret}`).toString("base64")
  const from = Math.floor(Date.now() / 1000) - Math.min(Math.max(months, 1), 24) * 31 * 86400
  const items: RzpPayment[] = []
  for (let skip = 0; skip < 5000; skip += 100) {
    const res = await fetch(`https://api.razorpay.com/v1/payments?count=100&skip=${skip}&from=${from}`, {
      headers: { authorization: auth },
      cache: "no-store",
    })
    if (res.status === 401) return { ok: false, error: "Razorpay rejected these keys. Check the test Key ID and Key Secret in Razorpay Dashboard → Account & Settings → API Keys (Test Mode)." }
    if (!res.ok) return { ok: false, error: `Razorpay API error ${res.status}. Try again in a minute.` }
    const page = (await res.json()) as { items?: RzpPayment[] }
    const got = page.items ?? []
    items.push(...got)
    if (got.length < 100) break
  }
  if (!items.length) return { ok: false, error: "No payments found in this Razorpay test account for the last 12 months. Make a few test payments first, or use the CSV upload." }

  // Same columns as the dashboard export, so the CSV parser does all validation in one place.
  const header = "id,created_at,amount,currency,status,method,email,contact,description,customer_id"
  const lines = items.map((p) =>
    [p.id, p.created_at, p.amount, p.currency, p.status, p.method, p.email, p.contact, p.description, p.customer_id].map(csvCell).join(",")
  )
  const up = await uploadPayments(listingId, [header, ...lines].join("\n"), "razorpay_api")
  if (!up.ok) return up
  return { ...up, fetched: items.length }
}
