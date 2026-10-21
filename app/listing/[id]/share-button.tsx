"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href.split("#")[0]
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} on Kickoff`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Couldn't share. Copy the address bar link instead.")
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={share}>
      <Share2 className="size-4" aria-hidden="true" /> Share
    </Button>
  )
}
