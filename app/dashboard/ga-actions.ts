"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { createClient } from "@/db/supabase/server"

import { getProfile } from "@/lib/auth"
import { fetchDailyTraffic, gaConfigured } from "@/lib/ga"
import { adminClient } from "@/lib/supabase-admin"

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string }

async function ownListing(listingId: string) {
  const profile = await getProfile()
  if (!profile || profile.role !== "founder") throw new Error("Log in as the founder of this listing.")
  const db = createClient()
  const { data } = await db.from("listings").select("id").eq("id", listingId).eq("founder_id", profile.id).maybeSingle()
  if (!data) throw new Error("Listing not found")
}

async function sync(listingId: string, propertyId: string) {
  const admin = adminClient()
  if (!admin) throw new Error("Server is missing SUPABASE_SERVICE_ROLE_KEY.")
  const days = await fetchDailyTraffic(propertyId)
  // Real data replaces any demo rows.
  await admin.from("traffic_daily").delete().eq("listing_id", listingId)
  if (days.length) {
    const { error } = await admin
      .from("traffic_daily")
      .insert(days.map((d) => ({ listing_id: listingId, ...d, is_demo: false })))
    if (error) throw new Error(error.message)
  }
  await admin
    .from("ga_connections")
    .upsert({ listing_id: listingId, property_id: propertyId, status: "connected", last_synced_at: new Date().toISOString() })
  await admin.from("summaries").delete().eq("listing_id", listingId)
  return days.length
}

export async function connectGa(listingId: string, propertyId: string): Promise<Result<{ days: number }>> {
  try {
    await ownListing(listingId)
    if (!gaConfigured()) return { ok: false, error: "Google Analytics isn't set up on this Kickoff server yet." }
    const id = propertyId.trim().replace(/^properties\//, "")
    if (!/^\d{6,12}$/.test(id)) return { ok: false, error: "Paste the GA4 property ID (numbers only, e.g. 412345678)." }
    const days = await sync(listingId, id)
    revalidatePath(`/dashboard/${listingId}`)
    revalidatePath(`/listing/${listingId}`)
    return { ok: true, days }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function refreshGa(listingId: string): Promise<Result<{ days: number }>> {
  try {
    await ownListing(listingId)
    const admin = adminClient()
    const { data } = await admin!.from("ga_connections").select("property_id").eq("listing_id", listingId).maybeSingle()
    if (!data) return { ok: false, error: "Connect Google Analytics first." }
    const days = await sync(listingId, data.property_id)
    revalidatePath(`/dashboard/${listingId}`)
    revalidatePath(`/listing/${listingId}`)
    return { ok: true, days }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
