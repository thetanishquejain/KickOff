"use server"

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/db/supabase/server"
import { getProfile } from "@/lib/auth"
import { validateKyc } from "@/lib/kyc"

type Result = { ok: true } | { ok: false; error: string }

export async function submitKyc(form: { legalName: string; pan: string; gstin?: string; consent: boolean }): Promise<Result> {
  const profile = await getProfile()
  if (!profile) return { ok: false, error: "Log in first." }
  const v = validateKyc({ role: profile.role, ...form })
  if (!v.ok) return v
  const db = createClient()
  // Never store the full PAN: a salted hash lets us spot reuse, the last four help the user recognise it.
  const pan_hash = createHash("sha256").update(`kickoff-kyc:${v.pan}`).digest("hex")
  const { error } = await db.from("kyc_verifications").upsert({
    user_id: profile.id,
    role: profile.role,
    legal_name: v.name,
    pan_last4: v.pan.slice(-4),
    pan_hash,
    gstin_last4: v.gstin ? v.gstin.slice(-4) : null,
    status: "verified_test",
    mode: "test",
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: /kyc_verifications/.test(error.message) ? "KYC isn't set up in the database yet." : error.message }
  revalidatePath("/", "layout")
  return { ok: true }
}
