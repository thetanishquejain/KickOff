import { NextResponse } from "next/server"
import { z } from "zod"

import { answerBuyer } from "@/lib/ai"
import { getProfile } from "@/lib/auth"
import { claudeConfigured } from "@/lib/claude"
import { getListing, trafficFacts } from "@/lib/data"
import type { Flag } from "@/lib/metrics"

export const maxDuration = 60

const body = z.object({
  listingId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1500) }))
    .min(1)
    .max(20),
})

export async function POST(req: Request) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: "Log in to ask questions." }, { status: 401 })
  if (!claudeConfigured()) return NextResponse.json({ error: "AI chat isn't switched on for this site yet." }, { status: 503 })
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 })
  const { listingId, messages } = parsed.data
  if (messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "Bad request" }, { status: 400 })

  const l = await getListing(listingId)
  if (!l || !l.metrics) return NextResponse.json({ error: "Listing not found." }, { status: 404 })

  try {
    const flags: Flag[] = l.flags.map((f) => ({ type: f.type as Flag["type"], title: f.title, detail: f.detail }))
    const res = await answerBuyer(
      { name: l.name, category: l.category, pitch: l.pitch, asking_price_inr: l.asking_price_inr },
      l.metrics,
      flags,
      trafficFacts(l),
      l.description,
      messages
    )
    return NextResponse.json(res)
  } catch {
    return NextResponse.json({ error: "The AI couldn't answer right now. Try again in a moment." }, { status: 502 })
  }
}
