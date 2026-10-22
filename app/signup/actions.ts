"use server"

import { createHash } from "node:crypto"
import { redirect } from "next/navigation"

import { createClient } from "@/db/supabase/server"
import { validateKyc } from "@/lib/kyc"
import { adminClient } from "@/lib/supabase-admin"

export type SignupState = { error?: string; field?: string }

const PAN_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"])
const MAX_PAN_FILE = 5 * 1024 * 1024

/** Checks the first bytes so a renamed file can't pass as a PAN card image or PDF. */
async function looksLikeImageOrPdf(file: File): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  const pdf = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46
  const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  return jpg || png || pdf || webp
}

function safeNext(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v : ""
  return s.startsWith("/") && !s.startsWith("//") ? s : null
}

/**
 * Prototype sign-up in one step: details + PAN card, then straight in.
 * Accounts are created already confirmed, so there is no "check your email" step.
 * KYC is test mode: the PAN format is checked and the card file is checked, but the file is not stored.
 */
export async function signUpWithKyc(_: SignupState, formData: FormData): Promise<SignupState> {
  const role = formData.get("role") === "buyer" ? "buyer" : "founder"
  const fullName = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ")
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const phone = String(formData.get("phone") ?? "").replace(/[\s-]/g, "")
  const pan = String(formData.get("pan") ?? "")
  const gstin = String(formData.get("gstin") ?? "")
  const consent = formData.get("consent") === "on"
  const panFile = formData.get("pan_card")

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", field: "email" }
  if (password.length < 8) return { error: "Use at least 8 characters for the password.", field: "password" }
  if (phone && !/^(\+91)?[6-9]\d{9}$/.test(phone)) return { error: "Enter a 10-digit Indian mobile number, like 98765 43210.", field: "phone" }

  const kyc = validateKyc({ role, legalName: fullName, pan, gstin, consent })
  if (!kyc.ok) return { error: kyc.error, field: /PAN|holder/.test(kyc.error) ? "pan" : /GSTIN/.test(kyc.error) ? "gstin" : /box/.test(kyc.error) ? "consent" : "full_name" }

  if (!(panFile instanceof File) || panFile.size === 0) return { error: "Upload a photo or PDF of your PAN card.", field: "pan_card" }
  if (panFile.size > MAX_PAN_FILE) return { error: "The PAN card file is over 5 MB. Upload a smaller photo or PDF.", field: "pan_card" }
  if (!PAN_FILE_TYPES.has(panFile.type) || !(await looksLikeImageOrPdf(panFile)))
    return { error: "The PAN card must be a JPG, PNG, WebP image or a PDF.", field: "pan_card" }

  const metadata = { role, full_name: kyc.name, phone: phone || null }
  const admin = adminClient()
  const db = createClient()

  if (admin) {
    // Created already confirmed: no confirmation email is sent.
    const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata })
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return { error: "An account with this email already exists. Log in instead.", field: "email" }
      return { error: error.message }
    }
  } else {
    // No service key on this server: fall back to a normal sign-up (works when email confirmation is off in Supabase).
    const { error } = await db.auth.signUp({ email, password, options: { data: metadata } })
    if (error) return { error: /already|registered/i.test(error.message) ? "An account with this email already exists. Log in instead." : error.message, field: "email" }
  }

  const { data: session, error: loginError } = await db.auth.signInWithPassword({ email, password })
  if (loginError || !session.user)
    return { error: "Your account was created, but email confirmation is still switched on in Supabase. Turn off 'Confirm email' in Supabase Auth settings, then log in." }

  // Never store the full PAN or the card image: a salted hash spots reuse, the last four help the user recognise it.
  const pan_hash = createHash("sha256").update(`kickoff-kyc:${kyc.pan}`).digest("hex")
  const now = new Date().toISOString()
  await db.from("kyc_verifications").upsert({
    user_id: session.user.id,
    role,
    legal_name: kyc.name,
    pan_last4: kyc.pan.slice(-4),
    pan_hash,
    gstin_last4: kyc.gstin ? kyc.gstin.slice(-4) : null,
    status: "verified_test",
    mode: "test",
    verified_at: now,
    updated_at: now,
  })

  redirect(safeNext(formData.get("next")) ?? (role === "founder" ? "/dashboard/new" : "/marketplace"))
}
