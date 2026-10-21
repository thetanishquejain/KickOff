"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { deleteListing, setPublished, updateListing, writeDescription } from "../actions"
import { ListingFields } from "../new/form"

type L = {
  id: string
  name: string
  category: string
  pitch: string
  website: string | null
  asking_price_inr: number | null
  description: string | null
  status: "draft" | "published"
}

export function DetailsPanel({ listing, categories, hasMetrics, aiReady }: { listing: L; categories: string[]; hasMetrics: boolean; aiReady: boolean }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [description, setDescription] = useState(listing.description ?? "")
  const [writing, setWriting] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function aiWrite() {
    setWriting(true)
    setNote(null)
    const r = await writeDescription(listing.id)
    setWriting(false)
    if (!r.ok) return void toast.error(r.error)
    setDescription(r.description)
    setNote(
      r.checked
        ? "Draft written by AI from your verified numbers. Every number was checked. Edit it before you save."
        : `Check this draft: these numbers didn't match your verified data: ${r.unknown.join(", ")}.`
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
      if (publish !== undefined) {
        const p = await setPublished(listing.id, publish)
        if (!p.ok) return void toast.error(p.error)
        toast.success(publish ? "Published to the marketplace." : "Moved back to draft.")
      } else toast.success("Saved.")
      router.refresh()
    })
  }

  return (
    <form ref={formRef} onSubmit={(e) => (e.preventDefault(), save())} className="grid gap-4 rounded-lg border border-line bg-surface p-6">
      <ListingFields categories={categories} values={listing} />
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">Description</Label>
          <Button type="button" size="sm" variant="secondary" onClick={aiWrite} disabled={!hasMetrics || !aiReady || writing}>
            <Sparkles className="size-4 text-brand" aria-hidden="true" />
            {writing ? "Writing…" : "Draft with AI"}
          </Button>
        </div>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={7}
          maxLength={2000}
          placeholder={hasMetrics ? "Describe your product, customers and why you're selling. Or let AI draft it from your verified numbers." : "Upload payments first to use the AI writer."}
          className="rounded-md border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {note && <p className="text-xs text-ink-muted">{note}</p>}
      </div>
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
            <Button type="button" disabled={pending || !hasMetrics} onClick={() => save(true)}>
              {pending ? "Publishing…" : "Save and publish"}
            </Button>
            <Button type="submit" variant="secondary" disabled={pending}>
              Save draft
            </Button>
          </>
        )}
        {!hasMetrics && <span className="text-xs text-ink-muted">Verify revenue to publish.</span>}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-danger hover:text-danger"
          onClick={() => {
            if (window.confirm("Delete this listing and its payment data?")) start(() => deleteListing(listing.id))
          }}
        >
          Delete listing
        </Button>
      </div>
    </form>
  )
}
