"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, FileUp, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { computeListing, labelListingPayments, uploadPayments } from "../actions"

const STEPS = ["Reading payments", "Labelling payments with AI", "Calculating metrics", "Checking risks"] as const

const SAMPLES = [
  { file: "a_healthy.csv", label: "Healthy SaaS" },
  { file: "b_concentration.csv", label: "One big customer" },
  { file: "c_inflated.csv", label: "Inflated last month" },
]

export function UploadPanel({ listingId, hasData, aiReady }: { listingId: string; hasData: boolean; aiReady: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<number | null>(null)
  const [done, setDone] = useState<{ seconds: number; count: number } | null>(null)
  const busy = step !== null

  async function run(text: string) {
    const started = Date.now()
    setDone(null)
    try {
      setStep(0)
      const up = await uploadPayments(listingId, text)
      if (!up.ok) throw new Error(up.error)
      if (up.skipped) toast.message(`${up.skipped} rows were skipped (failed, duplicate or non-INR).`)
      setStep(1)
      const lab = await labelListingPayments(listingId)
      if (!lab.ok) throw new Error(lab.error)
      if (lab.source === "rules") toast.warning(lab.aiError ? `AI labelling failed, used keyword rules instead.` : "Claude isn't set up, so keyword rules were used.")
      setStep(2)
      const res = await computeListing(listingId, { explain: false })
      if (!res.ok) throw new Error(res.error)
      setStep(3)
      if (res.flags > 0) {
        const ex = await computeListing(listingId, { explain: true })
        if (!ex.ok) throw new Error(ex.error)
      }
      setDone({ seconds: Math.round((Date.now() - started) / 100) / 10, count: up.count })
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setStep(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 5_000_000,
    disabled: busy,
    onDrop: async (files) => {
      const f = files[0]
      if (f) run(await f.text())
    },
    onDropRejected: () => toast.error("Upload one .csv file under 5 MB."),
  })

  async function loadSample(file: string) {
    const res = await fetch(`/samples/${file}`)
    run(await res.text())
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line px-6 py-10 text-center transition-colors duration-150 hover:bg-surface-hover",
          isDragActive && "border-saffron bg-saffron/5",
          busy && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} aria-label="Upload Razorpay payments CSV" />
        <FileUp className="size-6 text-saffron" aria-hidden="true" />
        <p className="text-sm text-ink">{hasData ? "Upload a new Razorpay payments CSV to re-verify" : "Drop your Razorpay payments CSV here, or click to choose"}</p>
        <p className="text-xs text-ink-muted">Razorpay Dashboard → Transactions → Payments → Export (CSV). Customer emails and phones are hashed, never stored.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span>No file handy? Try a sample:</span>
        {SAMPLES.map((s) => (
          <Button key={s.file} type="button" size="sm" variant="secondary" disabled={busy} onClick={() => loadSample(s.file)}>
            {s.label}
          </Button>
        ))}
      </div>

      {!aiReady && (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-ink">
          Claude isn't connected (no ANTHROPIC_API_KEY). Labels will use keyword rules and flag explanations will be skipped.
        </p>
      )}

      {(busy || done) && (
        <ol className="mt-6 grid gap-2" aria-live="polite">
          {STEPS.map((s, i) => {
            const state = done || (step !== null && i < step) ? "done" : step === i ? "active" : "todo"
            return (
              <li key={s} className={cn("flex items-center gap-2 text-sm", state === "todo" ? "text-ink-muted" : "text-ink")}>
                {state === "done" ? (
                  <Check className="size-4 text-verified" aria-hidden="true" />
                ) : state === "active" ? (
                  <Loader2 className="size-4 animate-spin text-saffron" aria-hidden="true" />
                ) : (
                  <span className="size-4 rounded-full border border-line" aria-hidden="true" />
                )}
                {s}
              </li>
            )
          })}
          {done && (
            <li className="mt-1 text-sm text-verified">
              Verified {done.count.toLocaleString("en-IN")} payments in {done.seconds}s.
            </li>
          )}
        </ol>
      )}
    </div>
  )
}
