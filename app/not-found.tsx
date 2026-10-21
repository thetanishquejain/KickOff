import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-ink-muted">This listing may be a draft, or it may have been removed.</p>
      <Link href="/marketplace" className="text-saffron hover:underline">
        Browse the marketplace
      </Link>
    </div>
  )
}
