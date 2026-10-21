"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { setPublished } from "../actions"

type Item = { ok: boolean; text: string; required?: boolean; fixHref?: string }

export function PublishPanel({ listingId, status, items }: { listingId: string; status: "draft" | "published"; items: Item[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [url, setUrl] = useState<string | null>(null)
  const canPublish = items.filter((i) => i.required).every((i) => i.ok)

  function go(publish: boolean) {
    start(async () => {
      const r = await setPublished(listingId, publish)
      if (!r.ok) return void toast.error(r.error)
      toast.success(publish ? "Published to the marketplace." : "Moved back to draft. Buyers can no longer see it.")
      setUrl(publish ? `${window.location.origin}/listing/${listingId}` : null)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-base font-semibold">Before you publish</h2>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {items.map((i) => (
            <li key={i.text} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex items-start gap-2">
                {i.ok ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden="true" />
                ) : (
                  <X className={cn("mt-0.5 size-4 shrink-0", i.required ? "text-danger" : "text-warning")} aria-hidden="true" />
                )}
                <span>
                  {i.text}
                  {!i.ok && <span className="text-ink-muted">{i.required ? " · required" : " · recommended"}</span>}
                  <span className="sr-only">{i.ok ? " (done)" : " (not done)"}</span>
                </span>
              </span>
              {!i.ok && i.fixHref && (
                <Link href={i.fixHref} className="shrink-0 text-caption font-medium text-brand hover:underline">
                  Fix
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <div className="text-caption text-ink-muted">Status</div>
        <div className={cn("text-lg font-semibold", status === "published" ? "text-verified" : "text-ink")}>{status === "published" ? "Published" : "Draft"}</div>
        <p className="text-sm text-ink-muted">
          {status === "published"
            ? "Buyers can find this listing in the marketplace and leaderboard."
            : "Only you can see this listing. Publishing shows it in the marketplace and leaderboard."}
        </p>
        {status === "published" ? (
          <Button variant="outline" disabled={pending} onClick={() => go(false)}>
            {pending ? "Unpublishing…" : "Unpublish"}
          </Button>
        ) : (
          <Button disabled={!canPublish || pending} onClick={() => go(true)}>
            {pending ? "Publishing…" : "Publish listing"}
          </Button>
        )}
        {!canPublish && status !== "published" && <p className="text-caption text-danger">Finish the required items first.</p>}
        {(url || status === "published") && (
          <div className="rounded-md bg-surface-hover p-3 text-caption">
            <div className="text-ink-muted">Public link</div>
            <Link href={`/listing/${listingId}`} className="break-all font-medium text-brand hover:underline">
              {url ?? `/listing/${listingId}`}
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
