import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * One short OpenRouter call to confirm the AI setup. Locked: the caller must send
 * ?t=<first 16 hex chars of sha256(OPENROUTER_API_KEY)>, so only someone who has the key can run it.
 * Returns the model that answered, its reply and the cost; never the key.
 */
export async function GET(req: Request) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return NextResponse.json({ ok: false, error: "OPENROUTER_API_KEY is not set on this deployment" }, { status: 503 })
  const expected = Buffer.from(createHash("sha256").update(key).digest("hex").slice(0, 16))
  const given = Buffer.from(new URL(req.url).searchParams.get("t") ?? "")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 })

  const model = process.env.OPENROUTER_MODEL?.startsWith("google/") ? process.env.OPENROUTER_MODEL : "google/gemini-4-argon"
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, "x-title": "Kickoff" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "In one short sentence, what does a verified-revenue startup marketplace do?" }],
      max_tokens: 60,
      provider: { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false },
      usage: { include: true },
    }),
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return NextResponse.json({ ok: false, status: res.status, error: data?.error ?? data }, { status: 502 })
  return NextResponse.json({
    ok: true,
    model: data.model,
    provider: data.provider,
    reply: data.choices?.[0]?.message?.content,
    usage: data.usage,
  })
}
