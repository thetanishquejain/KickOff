"use client"

import { useFormState, useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createListing } from "../actions"

const MODELS = [
  ["b2b", "Businesses"],
  ["b2c", "Consumers"],
  ["b2b2c", "Both"],
] as const

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-11 px-6">
      {pending ? "Saving…" : "Save and verify revenue"}
    </Button>
  )
}

const chip =
  "cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-hover has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:font-medium has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"

export function ListStartupForm({ categories }: { categories: string[] }) {
  const [state, action] = useFormState(createListing, {} as { error?: string })
  const thisMonth = new Date().toISOString().slice(0, 7)

  return (
    <form action={action} className="grid gap-7">
      <fieldset>
        <legend className="text-sm font-semibold">What are you listing?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c, i) => (
            <label key={c} className={chip}>
              <input type="radio" name="category" value={c} required defaultChecked={i === 0} className="sr-only" />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required maxLength={60} placeholder="LedgerLoop" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pitch">What it does, in one line</Label>
          <Input id="pitch" name="pitch" required minLength={10} maxLength={140} placeholder="GST invoicing for Indian freelancers" />
          <p className="text-caption text-ink-muted">Buyers see this under the name. You can add a longer description later.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="website">Website or app store link</Label>
            <Input id="website" name="website" placeholder="ledgerloop.in" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="founded_on">Started in</Label>
            <Input id="founded_on" name="founded_on" type="month" max={thisMonth} />
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Who pays for it?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODELS.map(([v, l]) => (
            <label key={v} className={chip}>
              <input type="radio" name="business_model" value={v} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 rounded-xl border border-line bg-bg p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="asking_price_inr">Asking price in ₹</Label>
          <Input id="asking_price_inr" name="asking_price_inr" inputMode="numeric" placeholder="25,00,000" className="num" />
          <p className="text-caption text-ink-muted">Leave blank if you&apos;re not sure yet. Buyers see the price and the multiple of your verified revenue.</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="hidden" name="is_for_sale_present" value="1" />
          <input type="checkbox" name="is_for_sale" defaultChecked className="mt-0.5 size-4 accent-[rgb(var(--primary))]" />
          <span>
            Open to offers
            <span className="block text-caption text-ink-muted">Untick to show verified revenue on the leaderboard without selling.</span>
          </span>
        </label>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-ink">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        <span className="text-caption text-ink-muted">Saved as a draft. Nothing is public until you publish.</span>
      </div>
    </form>
  )
}
