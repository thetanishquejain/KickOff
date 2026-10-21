import Link from "next/link"
import { redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"
import { getFounderListings } from "@/lib/data"
import { inrShort } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { EmptyState, Growth, InitialAvatar, VerifiedBadge } from "@/components/kit"

export const dynamic = "force-dynamic"
export const metadata = { title: "My listings" }

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/dashboard")
  if (profile.role !== "founder") redirect("/marketplace")
  const listings = await getFounderListings(profile.id)

  return (
    <div className="pt-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My listings</h1>
          <p className="mt-1 text-sm text-ink-muted">Hi {profile.full_name?.split(" ")[0] ?? "there"}. Verify your revenue and publish when you're ready.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">New listing</Link>
        </Button>
      </div>
      {listings.length ? (
        <div className="grid gap-3">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/${l.id}`}
              className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-colors duration-150 hover:bg-surface-hover"
            >
              <InitialAvatar name={l.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{l.name}</span>
                  <span
                    className={
                      l.status === "published"
                        ? "rounded-full bg-verified/15 px-2 py-0.5 text-xs text-verified"
                        : "rounded-full bg-surface-hover px-2 py-0.5 text-xs text-ink-muted"
                    }
                  >
                    {l.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="truncate text-xs text-ink-muted">{l.pitch}</div>
              </div>
              <div className="hidden text-right sm:block">
                {l.metrics ? (
                  <>
                    <div className="num text-lg font-bold">{inrShort(l.metrics.mrr)}</div>
                    <Growth value={l.metrics.growth_pct} className="text-xs" />
                  </>
                ) : (
                  <span className="text-xs text-ink-muted">No payment data yet</span>
                )}
              </div>
              {l.metrics && <VerifiedBadge className="hidden md:inline-flex" />}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="You haven't listed a startup yet.">
          <Button asChild>
            <Link href="/dashboard/new">List your startup</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  )
}
