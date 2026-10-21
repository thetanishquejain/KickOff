"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-ink-muted">We couldn&apos;t load this page. Your data is safe. Try again, or come back in a minute.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
