import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/db/supabase/server"

import { getProfile } from "@/lib/auth"
import { claudeConfigured } from "@/lib/claude"
import { CATEGORIES, getListing } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { VerifiedProfile } from "@/components/verified-profile"

import { DetailsPanel } from "./details-panel"
import { GaPanel } from "./ga-panel"
import { LabelsPanel, type LabelGroup } from "./labels-panel"
import { UploadPanel } from "./upload-panel"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export default async function ManageListingPage({ params }: { params: { id: string } }) {
  const profile = await getProfile()
  if (!profile) redirect(`/login?next=/dashboard/${params.id}`)
  const listing = await getListing(params.id)
  if (!listing || listing.founder_id !== profile.id) notFound()

  const db = createClient()
  const { data: payments } = await db
    .from("payments")
    .select("id, description, amount_inr, status, label, billing_interval, label_source, label_reason")
    .eq("listing_id", listing.id)
    .limit(5000)

  // Group payments by description pattern for the review table.
  const groups = new Map<string, LabelGroup>()
  for (const p of payments ?? []) {
    if (p.status === "failed") continue
    const pattern = (p.description || "(no description)").trim().toLowerCase().replace(/\binv[-\s#]*\d+/g, "inv-####")
    const key = `${pattern}|${p.label}|${p.billing_interval}`
    const g = groups.get(key)
    if (g) {
      g.ids.push(p.id)
      g.total += Number(p.amount_inr)
    } else {
      groups.set(key, {
        key,
        example: p.description || "(no description)",
        ids: [p.id],
        total: Number(p.amount_inr),
        label: p.label,
        interval: p.billing_interval,
        source: p.label_source,
        reason: p.label_reason,
      })
    }
  }
  const labelGroups = [...groups.values()].sort((a, b) => b.total - a.total)

  return (
    <div className="flex flex-col gap-10 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
            ← My listings
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{listing.name}</h1>
          <p className="text-sm text-ink-muted">{listing.pitch}</p>
        </div>
        {listing.status === "published" && (
          <Button asChild variant="secondary">
            <Link href={`/listing/${listing.id}`}>View public page</Link>
          </Button>
        )}
      </div>

      <section aria-labelledby="upload-heading" className="flex flex-col gap-4">
        <h2 id="upload-heading" className="text-xl font-semibold">
          1. Verify revenue
        </h2>
        <UploadPanel listingId={listing.id} hasData={Boolean(listing.metrics)} aiReady={claudeConfigured()} />
        {listing.metrics && <VerifiedProfile m={listing.metrics} flags={listing.flags} computedAt={listing.computed_at} />}
      </section>

      {labelGroups.length > 0 && (
        <section aria-labelledby="labels-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="labels-heading" className="text-xl font-semibold">
              2. Review payment labels
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              AI sorted each payment. Fix anything that's wrong and the numbers recalculate.
            </p>
          </div>
          <LabelsPanel listingId={listing.id} groups={labelGroups} />
        </section>
      )}

      <section aria-labelledby="details-heading" className="flex flex-col gap-4">
        <h2 id="details-heading" className="text-xl font-semibold">
          3. Write your listing and publish
        </h2>
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
          }}
          categories={CATEGORIES}
          hasMetrics={Boolean(listing.metrics)}
          aiReady={claudeConfigured()}
        />
      </section>

      <section aria-labelledby="ga-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="ga-heading" className="text-xl font-semibold">
            4. Connect Google Analytics <span className="text-sm font-normal text-ink-muted">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Adds verified traffic and revenue per visitor to your listing.</p>
        </div>
        <GaPanel
          listingId={listing.id}
          serviceEmail={process.env.GA_SERVICE_ACCOUNT_EMAIL ?? null}
          connection={listing.ga}
          hasDemoTraffic={listing.traffic.some((t) => t.is_demo)}
        />
      </section>
    </div>
  )
}
