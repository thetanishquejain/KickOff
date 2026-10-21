"use client"

import { useRef, useState } from "react"
import { Loader2, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Msg = { role: "user" | "assistant"; content: string }

const SUGGESTED = ["Is revenue dependent on one client?", "How fast is MRR growing?", "What hasn't been verified yet?"]

export function AskChat({ listingId, name }: { listingId: string; name: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    const next: Msg[] = [...messages, { role: "user", content: q }]
    setMessages(next)
    setInput("")
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, messages: next.slice(-12) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
      setMessages([...next, { role: "assistant", content: data.answer }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-line bg-surface">
      <div className="border-b border-line p-4">
        <h3 className="font-medium">Ask about this startup</h3>
        <p className="text-xs text-ink-muted">Answers use only {name}'s verified data. Numbers are checked before you see them.</p>
      </div>
      <div ref={listRef} className="flex max-h-[420px] min-h-[180px] flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-md border border-line px-3 py-2 text-left text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
              m.role === "user" ? "self-end bg-surface-hover text-ink" : "self-start border border-line bg-bg text-ink"
            )}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 self-start text-sm text-ink-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking the data…
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Your question
        </label>
        <input
          id="ask"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Ask about revenue, customers or risks…"
          className="h-10 flex-1 rounded-md border border-line bg-bg px-3 text-sm text-ink placeholder:text-ink-muted focus:border-saffron focus:outline-none focus:ring-1 focus:ring-saffron"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send question">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
