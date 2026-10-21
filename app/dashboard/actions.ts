"use server"

import "server-only"
import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/db/supabase/server"
import { z } from "zod"

import { draftListing, explainFlags, labelPayments, type LabelInput } from "@/lib/ai"
import { getProfile } from "@/lib/auth"
import { claudeConfigured } from "@/lib/claude"
import { parseRazorpayCsv, type ParseStats } from "@/lib/csv"
import { CATEGORIES } from "@/lib/data"
import { ruleLabel } from "@/lib/labels"
import { computeFlags, computeMetrics, type Interval, type Label, type PaymentRow } from "@/lib/metrics"

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string }

async function requireFounder() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/dashboard")
  if (profile.role !== "founder") redirect("/marketplace")
  return profile
}

async function requireOwnListing(listingId: string) {
  const profile = await requireFounder()
  const db = createClient()
  const { data } = await db.from("listings").select("*").eq("id", listingId).eq("founder_id", profile.id).maybeSingle()
  if (!data) throw new Error("Listing not found")
  return { db, listing: data, profile }
}

// ---------- Create / edit listing ----------

const listingSchema = z.object({
  name: z.string().trim().min(2, "Add your startup's name.").max(60),
  category: z.string().refine((c) => CATEGORIES.includes(c), "Pick a category."),
  pitch: z.string().trim().min(10, "Write a one-line pitch (at least 10 characters).").max(140),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? (/^https?:\/\//.test(v) ? v : `https://${v}`) : null)),
  asking_price_inr: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v.replace(/[,₹\s]/g, "")) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 1e11), "Asking price must be a number in rupees."),
})

export async function createListing(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const profile = await requireFounder()
  const parsed = listingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." }
  const db = createClient()
  const { data, error } = await db
    .from("listings")
    .insert({ ...parsed.data, founder_id: profile.id })
    .select("id")
    .single()
  if (error || !data) return { error: error?.message ?? "Couldn't create the listing." }
  redirect(`/dashboard/${data.id}?tab=payments`)
}

export async function updateListing(listingId: string, formData: FormData): Promise<Result> {
  try {
    const { db } = await requireOwnListing(listingId)
    const parsed = listingSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." }
    const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null
    const { error } = await db.from("listings").update({ ...parsed.data, description }).eq("id", listingId)
    if (error) return { ok: false, error: error.message }
    await clearSummary(listingId)
    revalidatePath(`/dashboard/${listingId}`)
    revalidatePath(`/listing/${listingId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function setPublished(listingId: string, publish: boolean): Promise<Result> {
  try {
    const { db } = await requireOwnListing(listingId)
    if (publish) {
      const { data: m } = await db.from("metrics").select("listing_id").eq("listing_id", listingId).maybeSingle()
      if (!m) return { ok: false, error: "Upload your Razorpay payments before publishing." }
    }
    const { error } = await db.from("listings").update({ status: publish ? "published" : "draft" }).eq("id", listingId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  const { db } = await requireOwnListing(listingId)
  await db.from("listings").delete().eq("id", listingId)
  revalidatePath("/", "layout")
  redirect("/dashboard")
}

// ---------- Step 1: upload CSV ----------

function hashCustomer(listingId: string, key: string | null) {
  if (!key) return null
  return "c_" + createHash("sha256").update(`${listingId}:${key.toLowerCase()}`).digest("hex").slice(0, 12)
}

export async function uploadPayments(listingId: string, csvText: string): Promise<Result<{ count: number; skipped: number; warnings: string[]; stats: ParseStats }>> {
  try {
    const { db } = await requireOwnListing(listingId)
    if (csvText.length > 5_000_000) return { ok: false, error: "File is too large (max 5 MB)." }
    const parsed = parseRazorpayCsv(csvText)
    if (!parsed.payments.length) return { ok: false, error: parsed.errors[0] ?? "No payments found in the file." }

    await db.from("payments").delete().eq("listing_id", listingId)
    const rows = parsed.payments.map((p) => ({
      listing_id: listingId,
      payment_id: p.payment_id,
      paid_at: p.paid_at,
      amount_inr: p.amount_inr,
      status: p.status,
      method: p.method,
      customer_key: hashCustomer(listingId, p.customer_key),
      description: p.description.slice(0, 300),
    }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from("payments").insert(rows.slice(i, i + 500))
      if (error) return { ok: false, error: error.message }
    }
    await db.from("listings").update({ data_source: "razorpay_csv" }).eq("id", listingId)
    return { ok: true, count: rows.length, skipped: parsed.skipped, warnings: parsed.errors, stats: parsed.stats }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- Step 2: label payments ----------

type DbPayment = {
  id: string
  payment_id: string
  paid_at: string
  amount_inr: number
  status: string
  customer_key: string | null
  description: string
  label: Label | null
  billing_interval: Interval
  label_source: string | null
}

async function loadPayments(db: ReturnType<typeof createClient>, listingId: string): Promise<DbPayment[]> {
  const all: DbPayment[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("payments")
      .select("id, payment_id, paid_at, amount_inr, status, customer_key, description, label, billing_interval, label_source")
      .eq("listing_id", listingId)
      .order("paid_at")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...((data ?? []).map((d) => ({ ...d, amount_inr: Number(d.amount_inr) })) as DbPayment[]))
    if (!data || data.length < 1000) break
  }
  return all
}

export async function labelListingPayments(listingId: string): Promise<Result<{ labelled: number; source: "ai" | "rules"; aiError?: string }>> {
  try {
    const { db } = await requireOwnListing(listingId)
    const payments = (await loadPayments(db, listingId)).filter((p) => p.label_source !== "founder")

    // Group identical payment patterns so Claude sees each pattern once.
    const byCustomer = new Map<string, DbPayment[]>()
    for (const p of payments) {
      const k = p.customer_key ?? `anon:${p.id}`
      byCustomer.set(k, [...(byCustomer.get(k) ?? []), p])
    }
    const groups = new Map<string, { input: LabelInput; ids: string[] }>()
    for (const p of payments) {
      const mine = byCustomer.get(p.customer_key ?? `anon:${p.id}`)!
      const count = mine.length
      const same = mine.every((x) => x.amount_inr === mine[0].amount_inr)
      const desc = p.description.trim().toLowerCase().replace(/\binv[-\s#]*\d+/g, "inv-####")
      const key = `${desc}|${p.amount_inr}|${Math.min(count, 6)}|${same}`
      const g = groups.get(key)
      if (g) g.ids.push(p.id)
      else
        groups.set(key, {
          ids: [p.id],
          input: {
            key: String(groups.size + 1),
            description: p.description || "(no description)",
            amount_inr: p.amount_inr,
            customer_payments: count,
            customer_same_amount: same,
          },
        })
    }

    let source: "ai" | "rules" = "rules"
    let aiError: string | undefined
    const results = new Map<string, { label: Label; interval: Interval; reason: string }>()
    if (claudeConfigured()) {
      try {
        const out = await labelPayments([...groups.values()].map((g) => g.input))
        for (const o of out) results.set(o.key, o)
        source = "ai"
      } catch (e) {
        aiError = (e as Error).message
      }
    }

    const updates: { id: string; label: Label; billing_interval: Interval; label_source: string; label_reason: string | null }[] = []
    for (const g of groups.values()) {
      const r = results.get(g.input.key)
      const fallback = ruleLabel(g.input.description, "captured", g.input)
      for (const id of g.ids) {
        updates.push({
          id,
          label: r?.label ?? fallback.label,
          billing_interval: r ? r.interval : fallback.interval,
          label_source: r ? "ai" : "rules",
          label_reason: r?.reason ?? null,
        })
      }
    }
    // Apply updates grouped by identical values to keep requests small.
    const buckets = new Map<string, string[]>()
    for (const u of updates) {
      const k = JSON.stringify([u.label, u.billing_interval, u.label_source, u.label_reason])
      buckets.set(k, [...(buckets.get(k) ?? []), u.id])
    }
    await Promise.all(
      [...buckets.entries()].map(async ([k, ids]) => {
        const [label, billing_interval, label_source, label_reason] = JSON.parse(k)
        for (let i = 0; i < ids.length; i += 200) {
          const { error } = await db
            .from("payments")
            .update({ label, billing_interval, label_source, label_reason })
            .in("id", ids.slice(i, i + 200))
          if (error) throw new Error(error.message)
        }
      })
    )
    return { ok: true, labelled: updates.length, source, aiError }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function overrideLabel(listingId: string, paymentIds: string[], label: Label, interval: Interval): Promise<Result> {
  try {
    const { db } = await requireOwnListing(listingId)
    const { error } = await db
      .from("payments")
      .update({ label, billing_interval: label === "recurring" ? interval ?? "monthly" : null, label_source: "founder", label_reason: "Corrected by founder" })
      .eq("listing_id", listingId)
      .in("id", paymentIds.slice(0, 500))
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- Step 3: metrics, flags, AI explanations ----------

async function clearSummary(listingId: string) {
  const { adminClient } = await import("@/lib/supabase-admin")
  const admin = adminClient()
  if (admin) await admin.from("summaries").delete().eq("listing_id", listingId)
}

export async function computeListing(listingId: string, opts?: { explain?: boolean }): Promise<Result<{ flags: number; explained: boolean }>> {
  try {
    const { db, listing } = await requireOwnListing(listingId)
    const payments = await loadPayments(db, listingId)
    const rows: PaymentRow[] = payments.map((p) => ({
      payment_id: p.payment_id,
      paid_at: p.paid_at,
      amount_inr: p.amount_inr,
      status: p.status,
      customer_key: p.customer_key,
      description: p.description,
      label: p.label,
      interval: p.billing_interval,
    }))
    const m = computeMetrics(rows)
    const flags = computeFlags(m)
    const now = new Date().toISOString()

    const { error: mErr } = await db.from("metrics").upsert({
      listing_id: listingId,
      mrr: m.mrr,
      arr: m.arr,
      growth_pct: m.growth_pct,
      revenue_6m: m.revenue_6m,
      revenue_total: m.revenue_total,
      refund_pct: m.refund_pct,
      top_customer_pct: m.top_customer_pct,
      customers_6m: m.customers_6m,
      latest_month: m.latest_month,
      data: m,
      computed_at: now,
    })
    if (mErr) return { ok: false, error: mErr.message }

    let explanations: { title: string; explanation: string; buyer_question: string }[] = []
    let explained = false
    if (opts?.explain !== false && flags.length && claudeConfigured()) {
      try {
        explanations = await explainFlags(
          { name: listing.name, category: listing.category, pitch: listing.pitch, asking_price_inr: listing.asking_price_inr ? Number(listing.asking_price_inr) : null },
          m,
          flags
        )
        explained = explanations.some((e) => e.explanation)
      } catch {
        explained = false
      }
    }

    await db.from("flags").delete().eq("listing_id", listingId)
    if (flags.length) {
      const { error } = await db.from("flags").insert(
        flags.map((f) => {
          const e = explanations.find((x) => x.title === f.title) ?? explanations[flags.indexOf(f)]
          return {
            listing_id: listingId,
            type: f.type,
            title: f.title,
            detail: f.detail,
            ai_explanation: e?.explanation || null,
            buyer_question: e?.buyer_question || null,
          }
        })
      )
      if (error) return { ok: false, error: error.message }
    }
    await db.from("listings").update({ verified_at: now }).eq("id", listingId)
    await clearSummary(listingId)
    revalidatePath(`/dashboard/${listingId}`)
    revalidatePath(`/listing/${listingId}`)
    return { ok: true, flags: flags.length, explained }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- AI listing writer ----------

export async function writeDescription(listingId: string): Promise<Result<{ description: string; checked: boolean; unknown: string[] }>> {
  try {
    const { db, listing } = await requireOwnListing(listingId)
    if (!claudeConfigured()) return { ok: false, error: "Add ANTHROPIC_API_KEY to use the AI listing writer." }
    const [{ data: m }, { data: f }] = await Promise.all([
      db.from("metrics").select("data").eq("listing_id", listingId).maybeSingle(),
      db.from("flags").select("type, title, detail").eq("listing_id", listingId),
    ])
    if (!m?.data) return { ok: false, error: "Upload payments first, so the writer has verified numbers." }
    const res = await draftListing(
      { name: listing.name, category: listing.category, pitch: listing.pitch, asking_price_inr: listing.asking_price_inr ? Number(listing.asking_price_inr) : null },
      m.data as any,
      (f ?? []) as any
    )
    return { ok: true, description: res.description, checked: res.check.ok, unknown: res.check.unknown }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
