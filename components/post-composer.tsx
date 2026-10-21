"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createPost } from "@/app/posts-actions"
import { Button } from "@/components/ui/button"

export function PostComposer({ listingId, listingName }: { listingId: string; listingName: string }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [pending, start] = useTransition()
  return (
    <form
      className="rounded-lg border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await createPost(listingId, text)
          if (!r.ok) return void toast.error(r.error)
          setText("")
          toast.success("Update posted")
          router.refresh()
        })
      }}
    >
      <label htmlFor={`post-${listingId}`} className="text-sm font-medium">
        Post an update on {listingName}
      </label>
      <textarea
        id={`post-${listingId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Shipped a feature, signed a customer, opened to offers… Buyers see this on your page and the home feed."
        className="mt-2 w-full rounded-md border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-caption text-ink-muted">Updates are your own words and aren&apos;t checked like your revenue. Don&apos;t include customer details.</span>
        <div className="flex shrink-0 items-center gap-3">
          <span className="num text-caption text-ink-muted">{text.length}/1000</span>
          <Button type="submit" size="sm" disabled={pending || !text.trim()}>
            {pending ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>
    </form>
  )
}
