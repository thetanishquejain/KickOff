"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Sparkles, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

import { deleteListing, setPublished, updateListing, writeDescription } from "../actions"
import { InsightFields } from "@/components/insight-fields"
import type { Insights } from "@/lib/insights"

import { ListingFields } from "../new/form"

type L = {
  id: string
  name: string
  category: string
  pitch: string
  website: string | null
  insights?: Insights | null
  is_for_sale?: boolean
  founded_on?: string | null
  asking_price_inr: number | null
  description: string | null
  status: "draft" | "published"
}

export function DetailsPanel({
  listing,
  categories,
  hasMetrics,
  aiReady,
  flagsCount = 0,
}: {
  listing: L
  categories: string[]
  hasMetrics: boolean
  aiReady: boolean
  flagsCount?: number
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [description, setDescription] = useState(listing.description ?? "")
  const [writing, setWriting] = useState(false)
  const [note, setNote] = useState<{ tone: "ok" | "warn"; text: string } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  async function aiWrite() {
    setWriting(true)
    setNote(null)
    const r = await writeDescription(listing.id)
    setWriting(false)
    if (!r.ok) return void toast.error(r.error)
    setDescription(r.description)
    setDirty(true)
    setNote(
      r.checked
        ? { tone: "ok", text: "AI draft from your verified numbers. Every number was checked against your metrics. Edit it, then save. Nothing is published until you choose to." }
        : { tone: "warn", text: `Check this draft before saving: these numbers didn't match your verified data: ${r.unknown.join(", ")}.` }
    )
  }

  function save(publish?: boolean) {
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    fd.set("description", description)
    start(async () => {
      const r = await updateListing(listing.id, fd)
      if (!r.ok) return void toast.error(r.error)
      setDirty(false)
      if (publish !== undefined) {
        const p = await setPublished(listing.id, publish)
        if (!p.ok) return void toast.error(p.error)
        if (publish) setPublishedUrl(`${window.location.origin}/listing/${listing.id}`)
        toast.success(publish ? "Published to the marketplace." : "Moved back to draft.")
        setReviewOpen(false)
      } else toast.success("Saved.")
      router.refresh()
    })
  }

  const askingSet = Boolean((formRef.current?.elements.namedItem("asking_price_inr") as HTMLInputElement | null)?.value ?? listing.asking_price_inr)
  const checklist: { ok: boolean; text: string; required?: boolean }[] = [
    { ok: hasMetrics, text: "Revenue checked from your Razorpay payments", required: true },
    { ok: description.trim().length >= 40, text: "Description written and reviewed by you" },
    { ok: askingSet, text: "Asking price set (needed for the multiple)" },
    { ok: true, text: flagsCount ? `${flagsCount} risk flag${flagsCount > 1 ? "s" : ""} will be shown to buyers` : "No risk flags found" },
  ]
  const canPublish = checklist.filter((c) => c.required).every((c) => c.ok)

  return (
    <>
      {publishedUrl && (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-verified/30 bg-verified/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Your listing is live at{" "}
            <Link href={publishedUrl.replace(window.location.origin, "")} className="font-medium text-brand underline-offset-2 hover:underline">
              {publishedUrl}
            </Link>
          </span>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(publishedUrl).then(() => toast.success("Link copied"))}>
            Copy link
          </Button>
        </div>
      )}
      <form
        ref={formRef}
        onChange={() => setDirty(true)}
        onSubmit={(e) => (e.preventDefault(), save())}
        className="grid gap-4 rounded-lg border border-line bg-surface p-6"
      >
        <ListingFields categories={categories} values={listing} />
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="description">Description</Label>
            <Button type="button" size="sm" variant="secondary" onClick={aiWrite} disabled={!hasMetrics || !aiReady || writing} aria-busy={writing}>
              <Sparkles className="size-4 text-brand" aria-hidden="true" />
              {writing ? "Writing…" : description ? "Rewrite with AI" : "Draft with AI"}
            </Button>
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setDirty(true)
            }}
            rows={7}
            maxLength={2000}
            placeholder={hasMetrics ? "Describe your product, customers and why you're selling. Or let AI draft it from your verified numbers." : "Upload payments first to use the AI writer."}
            className="rounded-md border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="flex justify-between gap-2 text-caption">
            {note ? <p className={note.tone === "ok" ? "text-ink-muted" : "text-warning"}>{note.text}</p> : <span />}
            <span className="num shrink-0 text-ink-muted">{description.length}/2000</span>
          </div>
          {!aiReady && <p className="text-caption text-ink-muted">AI writer needs ANTHROPIC_API_KEY or GEMINI_API_KEY on the server.</p>}
        </div>
        <InsightFields insights={listing.insights} foundedOn={listing.founded_on} />
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {listing.status === "published" ? (
            <>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="secondary" disabled={pending} onClick={() => save(false)}>
                Unpublish
              </Button>
            </>
          ) : (
            <>
              <Button type="button" disabled={pending} onClick={() => setReviewOpen(true)}>
                Review and publish
              </Button>
              <Button type="submit" variant="secondary" disabled={pending}>
                {pending ? "Saving…" : "Save draft"}
              </Button>
            </>
          )}
          {dirty && <span className="text-caption text-warning">Unsaved changes</span>}
          <Button type="button" variant="ghost" size="sm" className="ml-auto text-danger hover:text-danger" onClick={() => setDeleteOpen(true)}>
            Delete listing
          </Button>
        </div>
      </form>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md border-line bg-surface">
          <DialogHeader>
            <DialogTitle>Review before publishing</DialogTitle>
            <DialogDescription>Buyers will see your verified metrics, risk flags and description.</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {checklist.map((c) => (
              <li key={c.text} className="flex items-start gap-2">
                {c.ok ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden="true" />
                ) : (
                  <X className={cn("mt-0.5 size-4 shrink-0", c.required ? "text-danger" : "text-warning")} aria-hidden="true" />
                )}
                <span>
                  {c.text}
                  {!c.ok && <span className="text-ink-muted">{c.required ? " (required)" : " (recommended)"}</span>}
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>
              Keep editing
            </Button>
            <Button disabled={!canPublish || pending} onClick={() => save(true)}>
              {pending ? "Publishing…" : "Publish listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm border-line bg-surface">
          <DialogHeader>
            <DialogTitle>Delete {listing.name}?</DialogTitle>
            <DialogDescription>This removes the listing, its payments and metrics. You can&apos;t undo this.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => start(() => deleteListing(listing.id))}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
