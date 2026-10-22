import Link from "next/link"
import { isForSale } from "@/lib/market-query"
import { notFound, redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"
import { claudeConfigured } from "@/lib/claude"
import { CATEGORIES, getListing } from "@/lib/data"
import { monthLabel } from "@/lib/format"
import { VerifiedBadge } from "@/components/kit"

import { DetailsPanel } from "../../../dashboard/[id]/details-panel"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Edit listing" }

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const profile = await getProfile()
  if (!profile) redirect(`/login?next=/listing/${params.id}/edit`)
  const listing = await getListing(params.id)
  // Ownership is checked here and again in every server action.
  if (!listing || listing.founder_id !== profile.id) notFound()
  const m = listing.metrics

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pt-10">
      <div>
        <Link href={`/dashboard/${listing.id}`} className="text-sm text-ink-muted hover:text-ink">
          ← Back to {listing.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit listing</h1>
      </div>

      <section aria-label="Verification status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
        {m ? (
          <span className="flex flex-wrap items-center gap-2">
            <VerifiedBadge label="Revenue checked" />
            <span className="text-ink-muted">
              {m.payment_count.toLocaleString("en-IN")} payments, {m.first_month ? monthLabel(m.first_month) : ""} to {m.latest_month ? monthLabel(m.latest_month) : ""}
            </span>
          </span>
        ) : (
          <span className="text-warning">Revenue not checked yet. Upload your Razorpay payments to publish.</span>
        )}
        <span className="flex items-center gap-3">
          <span className={listing.status === "published" ? "text-verified" : "text-ink-muted"}>{listing.status === "published" ? "Published" : "Draft"}</span>
          <Link href={`/dashboard/${listing.id}?tab=payments`} className="text-brand hover:underline">
            {m ? "Re-upload payments" : "Upload payments"}
          </Link>
        </span>
      </section>

      <DetailsPanel
        listing={{
          id: listing.id,
          name: listing.name,
          category: listing.category,
          pitch: listing.pitch,
          website: listing.website,
          asking_price_inr: listing.asking_price_inr,
          description: listing.description,
          status: listing.status,
          insights: listing.insights ?? null,
          founded_on: listing.founded_on ?? null,
          is_for_sale: isForSale(listing),
        }}
        categories={CATEGORIES}
        hasMetrics={Boolean(m)}
        aiReady={claudeConfigured()}
        flagsCount={listing.flags.length}
      />
    </div>
  )
}
