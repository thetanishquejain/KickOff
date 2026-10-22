"use client"

import { useState } from "react"
import Link from "next/link"
import { useFormState, useFormStatus } from "react-dom"
import { FileCheck2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { signUpWithKyc, type SignupState } from "./actions"

function Submit({ role }: { role: "founder" | "buyer" }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full">
      {pending ? "Creating your account…" : role === "founder" ? "Create account and list my startup" : "Create account and start browsing"}
    </Button>
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function SignupForm({ initialRole, next }: { initialRole: "founder" | "buyer"; next?: string }) {
  const [state, action] = useFormState(signUpWithKyc, {} as SignupState)
  const [role, setRole] = useState<"founder" | "buyer">(initialRole)
  const [fileName, setFileName] = useState<string | null>(null)
  const err = (f: string) => (state.field === f ? state.error : undefined)
  const aria = (f: string) => (state.field === f ? { "aria-invalid": true, "aria-describedby": `${f}-error` } : {})

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:text-brand hover:underline">
          Log in
        </Link>
      </p>

      <form action={action} className="mt-6 grid gap-5">
        <input type="hidden" name="next" value={next ?? ""} />
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-2 text-sm font-medium">I want to</legend>
          {(
            [
              ["founder", "Sell or list", "My startup, app or tool"],
              ["buyer", "Buy", "Find a business to acquire"],
            ] as const
          ).map(([value, title, sub]) => (
            <label
              key={value}
              className="cursor-pointer rounded-lg border border-line p-3 transition-colors duration-150 hover:bg-surface-hover has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-caption text-ink-muted">{sub}</span>
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4">
          <Field id="full_name" label="Full name, as on your PAN card" error={err("full_name")}>
            <Input id="full_name" name="full_name" autoComplete="name" placeholder="Aditi Sharma" required {...aria("full_name")} />
          </Field>
          <Field id="email" label="Email" error={err("email")}>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.in" required {...aria("email")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="phone" label="Mobile (optional)" error={err("phone")}>
              <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" {...aria("phone")} />
            </Field>
            <Field id="password" label="Password" hint="At least 8 characters" error={err("password")}>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required {...aria("password")} />
            </Field>
          </div>
        </div>

        <div className="grid gap-4 border-t border-line pt-5">
          <div>
            <h2 className="text-sm font-semibold">Verify your identity</h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              {role === "founder" ? "Buyers see a KYC badge next to your listing." : "Founders see a KYC badge when you contact them."} Test mode: we check the format, not the Income Tax database.
            </p>
          </div>
          <div className={role === "founder" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            <Field id="pan" label="PAN number" error={err("pan")}>
              <Input id="pan" name="pan" required maxLength={10} placeholder="ABCDE1234F" className="num uppercase" autoComplete="off" {...aria("pan")} />
            </Field>
            {role === "founder" && (
              <Field id="gstin" label="GSTIN (optional)" error={err("gstin")}>
                <Input id="gstin" name="gstin" maxLength={15} placeholder="27ABCDE1234F1Z5" className="num uppercase" autoComplete="off" {...aria("gstin")} />
              </Field>
            )}
          </div>

          <Field id="pan_card" label="PAN card photo or PDF" error={err("pan_card")}>
            <label
              htmlFor="pan_card"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line px-4 py-4 text-sm transition-colors duration-150 hover:border-brand hover:bg-brand/5 focus-within:ring-2 focus-within:ring-brand"
            >
              {fileName ? <FileCheck2 className="size-5 shrink-0 text-verified" aria-hidden="true" /> : <Upload className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block truncate font-medium">{fileName ?? "Choose a file"}</span>
                <span className="block text-caption text-ink-muted">JPG, PNG, WebP or PDF, up to 5 MB</span>
              </span>
              <input
                id="pan_card"
                name="pan_card"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                {...aria("pan_card")}
              />
            </label>
          </Field>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[rgb(var(--primary))]" />
            <span>
              These details are mine and I agree to Kickoff checking them.
              <span className="block text-caption text-ink-muted">We keep your name and the last 4 characters of your PAN. The card file is checked, then discarded.</span>
              {err("consent") && <span className="block text-caption text-danger">{err("consent")}</span>}
            </span>
          </label>
        </div>

        {state.error && !state.field && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-ink">
            {state.error}
          </p>
        )}
        <Submit role={role} />
      </form>
    </div>
  )
}
