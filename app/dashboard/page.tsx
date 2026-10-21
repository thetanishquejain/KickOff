import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, Check } from "lucide-react"

import { getProfile } from "@/lib/auth"
import { getFounderListings, type ListingFull } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Growth, InitialAvatar, MetricTile } from "@/components/kit"
import { PageHeader } from "@/components/page-header"

export const dynamic = "force-dynamic"
export const metadata = { title: "My listings" }

function progress(l: ListingFull) {
  return [
    { label: "Listing created", done: true },
    { label: "Revenue checked", done: Boolean(l.metrics) },
    { label: "Description written", done: Boolean(l.description && l.description.length >= 40) },
    { label: "Published", done: l.status === "published" },
  ]
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function nextStep(l: ListingFull) {
  if (!l.metrics) return { text: "Upload your Razorpay payments", href: `/dashboard/${l.id}?tab=payments` }
  if (!l.description) return { text: "Write your description", href: `/dashboard/${l.id}?tab=listing` }
  if (l.status !== "published") return { text: "Review and publish", href: `/dashboard/${l.id}?tab=publish` }
  return { text: "View public page", href: `/listing/${l.id}` }
}

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/dashboard")
  if (profile.role !== "founder") redirect("/marketplace")
  const listings = await getFounderListings(profile.id)
  const published = listings.filter((l) => l.status === "published").length

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile.full_name?.split(" ")[0] ?? "founder"}`}
        actions={
          <Button asChild>
            <Link href="/dashboard/new">New listing</Link>
          </Button>
        }
      >
        {listings.length
          ? `${listings.length} listing${listings.length > 1 ? "s" : ""} · ${published} published · ${listings.length - published} draft`
          : "Check your revenue from payment data and publish your startup to buyers."}
      </PageHeader>

      {listings.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricTile label="Combined MRR" value={inrShort(listings.reduce((t, l) => t + (l.metrics?.mrr ?? 0), 0))} sub="Across listings with checked revenue" />
          <MetricTile label="Published" value={published} sub={`${listings.length - published} in draft`} />
          <MetricTile label="Revenue checked" value={`${listings.filter((l) => l.metrics).length}/${listings.length}`} sub="Listings with payment data" />
          <MetricTile
            label="Risk flags"
            value={listings.reduce((t, l) => t + l.flags.length, 0)}
            sub="Buyers see these on your page"
          />
        </div>
      )}

      {listings.length ? (
        <div className="grid gap-3">
          {listings.map((l) => {
            const steps = progress(l)
            const doneCount = steps.filter((s) => s.done).length
            const next = nextStep(l)
            return (
              <article key={l.id} className="rounded-lg border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-4">
                  <InitialAvatar name={l.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/${l.id}`} className="truncate font-medium hover:text-brand">
                        {l.name}
                      </Link>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-caption",
                          l.status === "published" ? "bg-verified/10 text-verified" : "bg-surface-hover text-ink-muted"
                        )}
                      >
                        {l.status === "published" ? "Published" : "Draft"}
                      </span>
                      {l.flags.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-caption text-warning">
                          <AlertTriangle className="size-3" aria-hidden="true" /> {l.flags.length} risk flag{l.flags.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-caption text-ink-muted">{l.pitch}</p>
                    <p className="text-caption text-ink-muted">
                      {l.category} · {l.computed_at ? `Revenue checked ${dateLabel(l.computed_at)}` : `Created ${dateLabel(l.created_at)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {l.metrics ? (
                      <>
                        <div className="num text-lg font-semibold">{inrShort(l.metrics.mrr)}</div>
                        <div className="text-caption text-ink-muted">
                          MRR · <Growth value={l.metrics.growth_pct} className="text-caption" />
                        </div>
                      </>
                    ) : (
                      <span className="text-caption text-ink-muted">No payment data yet</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 md:flex-row md:items-center md:justify-between">
                  <ol className="flex flex-wrap gap-x-4 gap-y-1" aria-label={`Progress: ${doneCount} of ${steps.length} steps done`}>
                    {steps.map((s) => (
                      <li key={s.label} className={cn("flex items-center gap-1.5 text-caption", s.done ? "text-ink" : "text-ink-muted")}>
                        {s.done ? (
                          <Check className="size-3.5 text-verified" aria-hidden="true" />
                        ) : (
                          <span className="size-3.5 rounded-full border border-line" aria-hidden="true" />
                        )}
                        {s.label}
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    {l.status !== "published" && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/listing/${l.id}`}>Preview</Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/${l.id}`}>Manage</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={next.href}>{next.text}</Link>
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Create a listing", "Add your startup's name, category, pitch and asking price."],
            ["2", "Upload Razorpay payments", "Export your payments CSV. Kickoff labels each payment and works out your metrics."],
            ["3", "Review and publish", "Check the numbers, edit the AI-drafted description and go live."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-lg border border-line bg-surface p-5">
              <span className="num inline-flex size-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{n}</span>
              <h2 className="mt-3 font-medium">{t}</h2>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </div>
          ))}
          <div className="md:col-span-3">
            <Button asChild size="lg">
              <Link href="/dashboard/new">Create your first listing</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
