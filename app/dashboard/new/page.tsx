import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

import { createClient } from "@/db/supabase/server"
import { getProfile } from "@/lib/auth"
import { CATEGORIES } from "@/lib/data"

import { ListStartupForm } from "./list-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "List your startup" }

const NEXT_STEPS: [string, string][] = [
  ["Tell us about it", "Name, what it does and your price. Takes two minutes."],
  ["Verify revenue", "Upload your Razorpay payments export or connect Razorpay. Kickoff works out MRR, growth and risks."],
  ["Review and publish", "Check the numbers, let AI draft your description, then publish to the marketplace."],
]

export default async function NewListingPage() {
  const profile = await getProfile()
  if (!profile) redirect("/signup?role=founder&next=/dashboard/new")
  if (profile.role !== "founder") redirect("/marketplace")
  const db = createClient()
  const { data: kyc } = await db.from("kyc_verifications").select("status").eq("user_id", profile.id).maybeSingle()
  const first = profile.full_name?.split(" ")[0]

  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.025em] md:text-[40px]">
          {first ? `List your startup, ${first}` : "List your startup"}
        </h1>
        <p className="mt-2 max-w-lg text-base text-ink-muted">SaaS, mobile app, AI tool or any digital business with paying customers.</p>
        {kyc?.status === "verified_test" ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1 text-caption font-medium text-verified">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> KYC done (test mode)
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            <Link href="/account/kyc" className="font-medium text-brand hover:underline">
              Verify your PAN
            </Link>{" "}
            so buyers see a KYC badge on your listing.
          </p>
        )}
        <div className="mt-8">
          <ListStartupForm categories={CATEGORIES} />
        </div>
      </div>

      <aside className="lg:pt-24">
        <h2 className="text-sm font-semibold">What happens next</h2>
        <ol className="mt-4 grid gap-5">
          {NEXT_STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
              <span
                className={`num flex size-7 items-center justify-center rounded-full text-caption font-semibold ${i === 0 ? "bg-brand text-brand-foreground" : "bg-surface-muted text-ink-muted"}`}
              >
                {i + 1}
              </span>
              <span>
                <span className={`block text-sm font-medium ${i === 0 ? "text-ink" : "text-ink-muted"}`}>{t}</span>
                <span className="block text-caption leading-5 text-ink-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
