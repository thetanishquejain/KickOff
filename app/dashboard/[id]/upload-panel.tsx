"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Check, FileUp, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import type { ParseStats } from "@/lib/csv"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { computeListing, labelListingPayments, uploadPayments } from "../actions"
import { importFromRazorpay } from "../razorpay-actions"

const STEPS = ["Uploading and reading the file", "Labelling payments", "Calculating metrics", "Checking for risks"] as const

const SAMPLES = [
  { file: "a_healthy.csv", label: "Healthy SaaS" },
  { file: "b_concentration.csv", label: "One big customer" },
  { file: "c_inflated.csv", label: "Inflated last month" },
]

type Done = { seconds: number; stats: ParseStats; labelSource: "ai" | "rules"; flags: number; warnings: string[] }

export function UploadPanel({ listingId, hasData, aiReady }: { listingId: string; hasData: boolean; aiReady: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<number | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [error, setError] = useState<{ step: number; message: string } | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const lastRun = useRef<{ name: string; load: () => ReturnType<typeof uploadPayments> } | null>(null)
  const [rzp, setRzp] = useState({ keyId: "", keySecret: "" })
  const busy = step !== null

  function run(text: string, name: string) {
    return runWith(name, () => uploadPayments(listingId, text))
  }

  async function runWith(name: string, load: () => ReturnType<typeof uploadPayments>) {
    lastRun.current = { name, load }
    setFileName(name)
    const started = Date.now()
    setDone(null)
    setError(null)
    let current = 0
    try {
      setStep(0)
      const up = await load()
      if (!up.ok) throw new Error(up.error)
      current = 1
      setStep(1)
      const lab = await labelListingPayments(listingId)
      if (!lab.ok) throw new Error(lab.error)
      if (lab.source === "rules") toast.warning(lab.aiError ? "AI labelling failed, so keyword rules were used. You can fix labels below." : "Claude isn't set up, so keyword rules were used.")
      current = 2
      setStep(2)
      const res = await computeListing(listingId, { explain: false })
      if (!res.ok) throw new Error(res.error)
      current = 3
      setStep(3)
      if (res.flags > 0) {
        const ex = await computeListing(listingId, { explain: true })
        if (!ex.ok) throw new Error(ex.error)
      }
      setDone({ seconds: Math.round((Date.now() - started) / 100) / 10, stats: up.stats, labelSource: lab.source, flags: res.flags, warnings: up.warnings })
      router.refresh()
    } catch (e) {
      setError({ step: current, message: (e as Error).message })
    } finally {
      setStep(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 5_000_000,
    disabled: busy,
    noClick: true,
    onDrop: async (files) => {
      const f = files[0]
      if (f) run(await f.text(), f.name)
    },
    onDropRejected: () => setError({ step: 0, message: "Upload one .csv file under 5 MB." }),
  })

  async function loadSample(file: string) {
    const res = await fetch(`/samples/${file}`)
    if (!res.ok) return setError({ step: 0, message: "Couldn't load the sample file." })
    run(await res.text(), file)
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line px-6 py-10 text-center transition-colors duration-150",
          isDragActive && "border-brand bg-brand/5",
          busy && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} aria-label="Razorpay payments CSV file" />
        <FileUp className="size-6 text-brand" aria-hidden="true" />
        <p className="text-sm text-ink">{hasData ? "Drop a new Razorpay payments CSV to re-check your numbers" : "Drag your Razorpay payments CSV here"}</p>
        <Button type="button" variant="outline" size="sm" onClick={open} disabled={busy}>
          Browse files
        </Button>
        <p className="max-w-md text-caption text-ink-muted">
          Razorpay Dashboard → Transactions → Payments → Export as CSV. Needed columns: id, created_at, amount (in paise), status. Optional: currency, method, email,
          contact, description, customer_id. Max 5 MB. Customer emails and phones are turned into one-way codes before storage.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
        <span>No file handy? Try a sample:</span>
        {SAMPLES.map((s) => (
          <Button key={s.file} type="button" size="sm" variant="secondary" disabled={busy} onClick={() => loadSample(s.file)}>
            {s.label}
          </Button>
        ))}
      </div>

      <form
        className="mt-6 rounded-md border border-line p-4"
        onSubmit={(e) => {
          e.preventDefault()
          const { keyId, keySecret } = rzp
          // The secret goes to our server once for this import and is cleared from the form right away.
          setRzp({ keyId, keySecret: "" })
          runWith("Razorpay API (test mode)", () => importFromRazorpay(listingId, keyId, keySecret))
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Or connect Razorpay directly</h3>
          <span className="rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">Test mode</span>
        </div>
        <p className="mt-1 text-caption text-ink-muted">
          Razorpay Dashboard → switch to <b>Test Mode</b> → Account &amp; Settings → API Keys. Kickoff reads your last 12 months of payments once. The Key Secret is used for
          this import only and is never stored.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="sr-only" htmlFor="rzp-id">
            Razorpay test Key ID
          </label>
          <input
            id="rzp-id"
            value={rzp.keyId}
            onChange={(e) => setRzp({ ...rzp, keyId: e.target.value })}
            placeholder="rzp_test_..."
            autoComplete="off"
            spellCheck={false}
            className="h-9 rounded-md border border-line bg-surface px-3 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <label className="sr-only" htmlFor="rzp-secret">
            Razorpay test Key Secret
          </label>
          <input
            id="rzp-secret"
            type="password"
            value={rzp.keySecret}
            onChange={(e) => setRzp({ ...rzp, keySecret: e.target.value })}
            placeholder="Key Secret"
            autoComplete="off"
            className="h-9 rounded-md border border-line bg-surface px-3 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <Button type="submit" size="sm" disabled={busy || !rzp.keyId.startsWith("rzp_test_") || rzp.keySecret.length < 10}>
            Import payments
          </Button>
        </div>
      </form>

      {!aiReady && (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-caption text-ink">
          AI isn&apos;t connected on this server (no ANTHROPIC_API_KEY or GEMINI_API_KEY). Labels will use keyword rules and flag explanations will be skipped.
        </p>
      )}

      {(busy || done || error) && (
        <div className="mt-6" aria-live="polite">
          {fileName && <p className="mb-2 text-caption text-ink-muted">File: {fileName}</p>}
          <ol className="grid gap-2">
            {STEPS.map((s, i) => {
              const state = error && error.step === i ? "error" : done || (step !== null && i < step) || (error && i < error.step) ? "done" : step === i ? "active" : "todo"
              return (
                <li key={s} className={cn("flex items-center gap-2 text-sm", state === "todo" ? "text-ink-muted" : "text-ink")}>
                  {state === "done" ? (
                    <Check className="size-4 text-verified" aria-hidden="true" />
                  ) : state === "active" ? (
                    <Loader2 className="size-4 animate-spin text-brand" aria-hidden="true" />
                  ) : state === "error" ? (
                    <AlertCircle className="size-4 text-danger" aria-hidden="true" />
                  ) : (
                    <span className="size-4 rounded-full border border-line" aria-hidden="true" />
                  )}
                  {s}
                  <span className="sr-only">: {state}</span>
                </li>
              )
            })}
          </ol>

          {error && (
            <div role="alert" className="mt-4 flex flex-col gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-ink">{error.message}</span>
              {lastRun.current && (
                <Button size="sm" variant="outline" onClick={() => runWith(lastRun.current!.name, lastRun.current!.load)}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {done && <ValidationSummary d={done} />}
        </div>
      )}
    </div>
  )
}

function ValidationSummary({ d }: { d: Done }) {
  const s = d.stats
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "–")
  const items: [string, string | number][] = [
    ["Rows in file", s.rows],
    ["Payments imported", s.imported],
    ["Duplicates skipped", s.duplicates],
    ["Invalid rows skipped", s.invalid],
    ["Non-INR skipped", s.nonInr],
    ["Failed payments (not counted)", s.failed],
    ["Refunded payments", s.refunded],
  ]
  return (
    <div className="mt-4 rounded-md border border-line bg-surface-hover p-4">
      <p className="text-sm font-medium text-ink">
        Processed in {d.seconds}s · {fmt(s.firstDate)} to {fmt(s.lastDate)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="num text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-caption text-ink-muted">
        Labels by {d.labelSource === "ai" ? "AI" : "keyword rules"}. {d.flags ? `${d.flags} risk flag${d.flags > 1 ? "s" : ""} found.` : "No risk flags found."} Metrics are calculated from
        this file only. Kickoff can&apos;t confirm the export is complete. Review the labels below before you publish.
      </p>
      {d.warnings.map((w) => (
        <p key={w} className="mt-1 text-caption text-warning">
          {w}
        </p>
      ))}
    </div>
  )
}
