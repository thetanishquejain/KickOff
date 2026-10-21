"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DemoTag } from "@/components/kit"

import { connectGa, refreshGa } from "../ga-actions"

export function GaPanel({
  listingId,
  serviceEmail,
  connection,
  hasDemoTraffic,
}: {
  listingId: string
  serviceEmail: string | null
  connection: { property_id: string; last_synced_at: string | null } | null
  hasDemoTraffic: boolean
}) {
  const router = useRouter()
  const [propertyId, setPropertyId] = useState(connection?.property_id ?? "")
  const [pending, start] = useTransition()

  if (!serviceEmail) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 text-sm text-ink-muted">
        Google Analytics isn't set up on this Kickoff server yet.
        {hasDemoTraffic && (
          <span className="ml-2">
            This listing shows <DemoTag /> traffic.
          </span>
        )}
      </div>
    )
  }

  const run = (fn: () => Promise<{ ok: true; days: number } | { ok: false; error: string }>) =>
    start(async () => {
      const r = await fn()
      if (!r.ok) return void toast.error(r.error)
      toast.success(`Traffic verified: ${r.days} days imported from Google Analytics.`)
      router.refresh()
    })

  return (
    <div className="grid gap-4 rounded-lg border border-line bg-surface p-6">
      {connection ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-verified">Connected</span> to property <span className="num">{connection.property_id}</span>
            {connection.last_synced_at && (
              <span className="text-ink-muted"> · last synced {new Date(connection.last_synced_at).toLocaleString("en-IN")}</span>
            )}
          </p>
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => refreshGa(listingId))}>
            {pending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      ) : (
        <>
          <ol className="grid gap-2 text-sm text-ink-muted">
            <li>
              1. In Google Analytics, open <span className="text-ink">Admin → Property access management</span>.
            </li>
            <li className="flex flex-wrap items-center gap-2">
              2. Add this email as a <span className="text-ink">Viewer</span>:
              <code className="num rounded-sm bg-bg px-2 py-1 text-xs text-ink">{serviceEmail}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(serviceEmail).then(() => toast.success("Copied"))}
                aria-label="Copy service account email"
              >
                <Copy className="size-4" />
              </Button>
            </li>
            <li>
              3. Copy your <span className="text-ink">GA4 property ID</span> from Admin → Property details, and paste it below.
            </li>
          </ol>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => connectGa(listingId, propertyId))
            }}
          >
            <div className="grid flex-1 gap-2">
              <Label htmlFor="ga-prop">GA4 property ID</Label>
              <Input id="ga-prop" inputMode="numeric" className="num" placeholder="412345678" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} />
            </div>
            <Button type="submit" disabled={pending || !propertyId.trim()}>
              {pending ? "Verifying…" : "Verify"}
            </Button>
          </form>
          {hasDemoTraffic && (
            <p className="text-xs text-ink-muted">
              This listing currently shows <DemoTag /> traffic. Connecting replaces it with verified data.
            </p>
          )}
        </>
      )}
    </div>
  )
}
