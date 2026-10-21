import "server-only"
import { createClient } from "@/db/supabase/server"

export type Profile = { id: string; role: "founder" | "buyer"; full_name: string | null; email: string | null }

export async function getProfile(): Promise<Profile | null> {
  const db = createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) return null
  const { data } = await db.from("profiles").select("id, role, full_name").eq("id", user.id).maybeSingle()
  return {
    id: user.id,
    role: (data?.role as Profile["role"]) ?? ((user.user_metadata?.role as Profile["role"]) || "buyer"),
    full_name: data?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    email: user.email ?? null,
  }
}
