"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { PAN_RE } from "@/lib/kyc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { submitKyc } from "./actions"

export function KycForm({ role, defaultName, done }: { role: "founder" | "buyer"; defaultName: string; done: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pan, setPan] = useState("")
  return (
    <form
      className="grid gap-4 rounded-lg border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        start(async () => {
          const r = await submitKyc({
            legalName: String(f.get("legal_name") ?? ""),
            pan: String(f.get("pan") ?? ""),
            gstin: String(f.get("gstin") ?? ""),
            consent: f.get("consent") === "on",
          })
          if (!r.ok) return void setError(r.error)
          setError(null)
          setPan("")
          toast.success("KYC verified (test mode)")
          router.refresh()
        })
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="legal_name">Full legal name (as on PAN)</Label>
        <Input id="legal_name" name="legal_name" defaultValue={defaultName} autoComplete="name" required maxLength={100} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pan">PAN</Label>
        <Input
          id="pan"
          name="pan"
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
          placeholder="ABCDE1234F"
          autoComplete="off"
          className="font-mono uppercase tracking-wider"
          aria-invalid={pan.length === 10 && !PAN_RE.test(pan)}
          required
        />
        <p className="text-caption text-ink-muted">5 letters, 4 digits, 1 letter. Only the last four are kept.</p>
      </div>
      {role === "founder" && (
        <div className="grid gap-2">
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input id="gstin" name="gstin" placeholder="27ABCDE1234F1Z5" autoComplete="off" className="font-mono uppercase tracking-wider" maxLength={15} />
        </div>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[rgb(var(--primary))]" required />
        <span>These details are mine, and I agree to Kickoff using them to show a KYC badge.</span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : done ? "Update KYC" : "Verify (test mode)"}
        </Button>
      </div>
    </form>
  )
}
