import "server-only"

// Minimal Claude Messages API client (no SDK needed).
const API = "https://api.anthropic.com/v1/messages"

export const MODELS = {
  // Writing, summaries, chat
  smart: process.env.CLAUDE_MODEL || "claude-sonnet-4-5",
  // Payment labelling (fast, cheap)
  fast: process.env.CLAUDE_FAST_MODEL || "claude-haiku-4-5",
}

export function claudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export type ChatTurn = { role: "user" | "assistant"; content: string }

export async function claude(opts: {
  system: string
  messages: ChatTurn[]
  model?: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set")
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? MODELS.smart,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.2,
      system: opts.system,
      messages: opts.messages,
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = (await res.json()) as { content: { type: string; text?: string }[] }
  return data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
}

/** Ask Claude for JSON and parse it (tolerates code fences / leading text). */
export async function claudeJson<T>(opts: Parameters<typeof claude>[0]): Promise<T> {
  const text = await claude(opts)
  return parseJson<T>(text)
}

export function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.search(/[[{]/)
  const endObj = body.lastIndexOf("}")
  const endArr = body.lastIndexOf("]")
  const end = Math.max(endObj, endArr)
  if (start < 0 || end < start) throw new Error("No JSON in Claude response")
  return JSON.parse(body.slice(start, end + 1)) as T
}
