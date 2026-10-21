"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart, Share2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deletePost, toggleLike } from "@/app/posts-actions"
import type { Post } from "@/lib/data"
import { cn } from "@/lib/utils"

import { InitialAvatar } from "./kit"

function ago(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export function PostCard({ p, viewerId, hideListing }: { p: Post; viewerId?: string | null; hideListing?: boolean }) {
  const router = useRouter()
  const [liked, setLiked] = useState(p.liked)
  const [likes, setLikes] = useState(p.likes)
  const [expanded, setExpanded] = useState(false)
  const [, start] = useTransition()
  const long = p.body.length > 280

  function like() {
    if (!viewerId) return void toast("Log in to like updates.")
    const next = !liked
    setLiked(next)
    setLikes((n) => n + (next ? 1 : -1))
    start(async () => {
      const r = await toggleLike(p.id, next)
      if (!r.ok) {
        setLiked(!next)
        setLikes((n) => n + (next ? -1 : 1))
        toast.error(r.error)
      }
    })
  }

  return (
    <article className="break-inside-avoid rounded-lg border border-line bg-surface p-4 shadow-card">
      <header className="flex items-start gap-2.5">
        <InitialAvatar name={p.author_name} size={32} className="rounded-full" />
        <div className="min-w-0 flex-1 text-sm leading-5">
          <span className="font-medium text-ink">{p.author_name ?? "Founder"}</span>
          {!hideListing && (
            <>
              <span className="text-ink-muted"> on </span>
              <Link href={`/listing/${p.listing_id}`} className="font-medium text-ink hover:text-brand">
                {p.listing_name}
              </Link>
            </>
          )}
          <span className="text-ink-muted"> · {ago(p.created_at)}</span>
          {p.is_demo && <span className="ml-1 text-[11px] text-ink-muted">· demo</span>}
        </div>
      </header>
      <p className={cn("mt-2.5 whitespace-pre-line text-sm leading-6 text-ink", long && !expanded && "line-clamp-5")}>{p.body}</p>
      {long && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-1 text-caption font-medium text-ink-muted hover:text-ink">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <footer className="mt-3 flex items-center gap-4 text-caption text-ink-muted">
        <button type="button" onClick={like} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} className={cn("inline-flex items-center gap-1 hover:text-ink", liked && "text-danger hover:text-danger")}>
          <Heart className={cn("size-4", liked && "fill-current")} aria-hidden="true" />
          <span className="num">{likes}</span>
        </button>
        <button
          type="button"
          aria-label="Copy link to this startup"
          className="inline-flex items-center gap-1 hover:text-ink"
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/listing/${p.listing_id}`).then(() => toast.success("Link copied"))}
        >
          <Share2 className="size-4" aria-hidden="true" />
        </button>
        {viewerId === p.author_id && (
          <button
            type="button"
            aria-label="Delete update"
            className="ml-auto inline-flex items-center gap-1 hover:text-danger"
            onClick={() =>
              start(async () => {
                const r = await deletePost(p.id)
                if (!r.ok) return void toast.error(r.error)
                toast.success("Update deleted")
                router.refresh()
              })
            }
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  )
}

export function PostGrid({ posts, viewerId, hideListing }: { posts: Post[]; viewerId?: string | null; hideListing?: boolean }) {
  return (
    <div className="columns-1 gap-3 space-y-3 md:columns-2 lg:columns-3">
      {posts.map((p) => (
        <PostCard key={p.id} p={p} viewerId={viewerId} hideListing={hideListing} />
      ))}
    </div>
  )
}
