import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"

import { createClient } from "@/db/supabase/server"
import { getProfile } from "@/lib/auth"
import { PageHeader } from "@/components/page-header"

import { KycForm } from "./form"

export const dynamic = "force-dynamic"
export const metadata = { title: "KYC verification" }

export default async function KycPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/account/kyc")
  const db = createClient()
  const { data: kyc } = await db.from("kyc_verifications").select("legal_name, pan_last4, gstin_last4, status, verified_at").eq("user_id", profile.id).maybeSingle()

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader title="KYC verification">
        {profile.role === "founder"
          ? "Verify who you are so buyers know a real founder stands behind the listing."
          : "Verify who you are before you contact founders or make offers."}
      </PageHeader>

      <p className="mb-5 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-ink">
        <b>Test mode.</b> Kickoff checks the format of your PAN{profile.role === "founder" ? " and GSTIN" : ""} but doesn&apos;t look it up with the Income Tax or GST
        systems yet. Badges say &ldquo;KYC (test)&rdquo; until live checks through a licensed provider are added.
      </p>

      {kyc && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-verified/30 bg-verified/10 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-verified" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-ink">KYC verified (test mode)</p>
            <p className="text-ink-muted">
              {kyc.legal_name} · PAN ending {kyc.pan_last4}
              {kyc.gstin_last4 ? ` · GSTIN ending ${kyc.gstin_last4}` : ""} · {new Date(kyc.verified_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      )}

      <KycForm role={profile.role} defaultName={kyc?.legal_name ?? profile.full_name ?? ""} done={Boolean(kyc)} />

      <h2 className="mt-8 text-sm font-semibold">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
        <li>Your legal name and the last four characters of your PAN{profile.role === "founder" ? " and GSTIN" : ""}.</li>
        <li>A one-way code made from your PAN, so the same PAN can be recognised later. The full PAN is never saved.</li>
        <li>Other people only ever see &ldquo;KYC (test)&rdquo; next to your name, never your details.</li>
      </ul>
    </div>
  )
}
