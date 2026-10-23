import "server-only"

// Minimal LLM client (no SDK needed). Claude is the main provider. Gemini is the backup: if a
// Claude call fails (or only GEMINI_API_KEY is set), the same prompt goes to Google's Gemini API.
// Prompts, JSON parsing and the number check are identical either way.
const API = "https://api.anthropic.com/v1/messages"
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models"

export const MODELS = {
  // Writing, summaries, chat
  smart: process.env.CLAUDE_MODEL || "claude-sonnet-4-5",
  // Payment labelling (fast, cheap)
  fast: process.env.CLAUDE_FAST_MODEL || "claude-haiku-4-5",
}

const GEMINI_MODELS = {
  smart: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  fast: process.env.GEMINI_FAST_MODEL || "gemini-2.5-flash",
}

export function aiProvider(): "claude" | "gemini" | null {
  if (process.env.ANTHROPIC_API_KEY) return "claude"
  if (process.env.GEMINI_API_KEY) return "gemini"
  return null
}

/** True when any AI provider key is configured. */
export function claudeConfigured() {
  return aiProvider() !== null
}

export type ChatTurn = { role: "user" | "assistant"; content: string }

export async function claude(opts: {
  system: string
  messages: ChatTurn[]
  model?: string
  maxTokens?: number
  temperature?: number
  json?: boolean
}): Promise<string> {
  const provider = aiProvider()
  if (provider === "gemini") return gemini(opts)
  if (!provider) throw new Error("No AI key set: add ANTHROPIC_API_KEY or GEMINI_API_KEY")
  try {
    return await callClaude(opts)
  } catch (e) {
    // Claude is the main model; Gemini takes over the same request if Claude fails.
    if (process.env.GEMINI_API_KEY) return gemini(opts)
    throw e
  }
}

async function callClaude(opts: { system: string; messages: ChatTurn[]; model?: string; maxTokens?: number; temperature?: number; json?: boolean }): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!
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

async function gemini(opts: { system: string; messages: ChatTurn[]; model?: string; maxTokens?: number; temperature?: number; json?: boolean }): Promise<string> {
  const key = process.env.GEMINI_API_KEY!
  const model = opts.model === MODELS.fast ? GEMINI_MODELS.fast : GEMINI_MODELS.smart
  const res = await fetch(`${GEMINI_API}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxTokens ?? 1500,
        // Thinking tokens would count against maxOutputTokens and can cut answers short.
        thinkingConfig: { thinkingBudget: 0 },
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("")
}

/** Ask the model for JSON and parse it (tolerates code fences / leading text). */
export async function claudeJson<T>(opts: Parameters<typeof claude>[0]): Promise<T> {
  const text = await claude({ ...opts, json: true })
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
