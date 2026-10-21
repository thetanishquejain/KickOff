"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/db/supabase/server"
import { getProfile } from "@/lib/auth"

type Result = { ok: true } | { ok: false; error: string }

const body = z.string().trim().min(1, "Write something first.").max(1000, "Keep updates under 1,000 characters.")

export async function createPost(listingId: string, text: string): Promise<Result> {
  const profile = await getProfile()
  if (!profile || profile.role !== "founder") return { ok: false, error: "Only founders can post updates." }
  const parsed = body.safeParse(text)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const db = createClient()
  // Ownership is checked here and again by row-level security.
  const { data: own } = await db.from("listings").select("id").eq("id", listingId).eq("founder_id", profile.id).maybeSingle()
  if (!own) return { ok: false, error: "You can only post on your own listings." }
  const { error } = await db.from("posts").insert({ listing_id: listingId, author_id: profile.id, body: parsed.data })
  if (error) return { ok: false, error: error.message.includes("posts") ? "Updates aren't set up in the database yet." : error.message }
  revalidatePath("/")
  revalidatePath("/feed")
  revalidatePath(`/listing/${listingId}`)
  return { ok: true }
}

export async function deletePost(postId: string): Promise<Result> {
  const profile = await getProfile()
  if (!profile) return { ok: false, error: "Log in first." }
  const db = createClient()
  const { error } = await db.from("posts").delete().eq("id", postId).eq("author_id", profile.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function toggleLike(postId: string, like: boolean): Promise<Result> {
  const profile = await getProfile()
  if (!profile) return { ok: false, error: "Log in to like updates." }
  const db = createClient()
  const { error } = like
    ? await db.from("post_likes").upsert({ post_id: postId, user_id: profile.id })
    : await db.from("post_likes").delete().eq("post_id", postId).eq("user_id", profile.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
