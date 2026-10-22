"use client"

import { useFormState, useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createListing } from "../actions"

export function ListingFields({
  categories,
  values,
}: {
  categories: string[]
  values?: { name?: string; category?: string; pitch?: string; website?: string | null; asking_price_inr?: number | null; is_for_sale?: boolean }
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="name">Startup name</Label>
        <Input id="name" name="name" required maxLength={60} defaultValue={values?.name} placeholder="LedgerLoop" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue={values?.category ?? ""}
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="" disabled>
            Pick a category
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pitch">One-line pitch</Label>
        <Input id="pitch" name="pitch" required maxLength={140} defaultValue={values?.pitch} placeholder="GST invoicing for Indian freelancers" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="grid gap-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input id="website" name="website" defaultValue={values?.website ?? ""} placeholder="ledgerloop.in" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="asking_price_inr">Asking price in ₹ (optional)</Label>
          <Input
            id="asking_price_inr"
            name="asking_price_inr"
            inputMode="numeric"
            defaultValue={values?.asking_price_inr ?? ""}
            placeholder="2500000"
            className="num"
          />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="hidden" name="is_for_sale_present" value="1" />
        <input type="checkbox" name="is_for_sale" defaultChecked={values?.is_for_sale ?? true} className="mt-0.5 size-4 accent-[rgb(var(--primary))]" />
        <span>
          Open to offers
          <span className="block text-caption text-ink-muted">Shows a FOR SALE tag and includes the listing in &ldquo;For sale only&rdquo; results. Untick to show verified revenue without selling.</span>
        </span>
      </label>
    </>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create listing"}
    </Button>
  )
}

export function NewListingForm({ categories }: { categories: string[] }) {
  const [state, action] = useFormState(createListing, {} as { error?: string })
  return (
    <form action={action} className="mt-6 grid gap-4 rounded-lg border border-line bg-surface p-6">
      <ListingFields categories={categories} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  )
}
