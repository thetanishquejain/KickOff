import { notFound } from "next/navigation"

import { getPublishedListings, kycStatus } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { InitialAvatar, KycBadge } from "@/components/kit"
import { ListingCard } from "@/components/listing-card"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { id: string } }) {
  const ls = (await getPublishedListings()).filter((l) => l.founder_id === params.id)
  return { title: ls[0]?.founder_name ?? "Founder" }
}

/** Public founder page: only published listings, only numbers already shown on those listings. */
export default async function FounderPage({ params }: { params: { id: string } }) {
  const listings = (await getPublishedListings()).filter((l) => l.founder_id === params.id)
  if (!listings.length) notFound()
  const name = listings[0].founder_name ?? "Founder"
  const verified = listings.filter((l) => l.metrics)
  const totalMrr = verified.reduce((s, l) => s + (l.metrics?.mrr ?? 0), 0)
  const demo = listings.some((l) => l.is_demo)
  const kyc = await kycStatus(params.id)

  return (
    <div className="pb-8 pt-8">
      <header className="flex flex-wrap items-center gap-4 border-b border-line pb-6">
        <InitialAvatar name={name} size={56} className="rounded-full" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {name} <KycBadge status={kyc} />
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Founder · {listings.length} published {listings.length === 1 ? "startup" : "startups"}
            {demo && " · demo profile"}
          </p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-caption text-ink-muted">Combined MRR</dt>
            <dd className="num text-lg font-semibold">{verified.length ? inrShort(totalMrr) : "–"}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">Revenue checked</dt>
            <dd className="num text-lg font-semibold">
              {verified.length}/{listings.length}
            </dd>
          </div>
        </dl>
      </header>

      <h2 className="mb-3 mt-6 text-base font-semibold">Startups</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {listings.map((l) => (
          <ListingCard key={l.id} l={l} />
        ))}
      </div>
    </div>
  )
}
