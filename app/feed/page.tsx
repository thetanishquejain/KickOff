import Link from "next/link"

import { getProfile } from "@/lib/auth"
import { getPosts } from "@/lib/data"
import { EmptyState } from "@/components/kit"
import { PageHeader } from "@/components/page-header"
import { PostGrid } from "@/components/post-card"

export const dynamic = "force-dynamic"
export const metadata = { title: "Founder updates" }

export default async function FeedPage() {
  const profile = await getProfile()
  const posts = await getPosts({ limit: 60, viewerId: profile?.id })
  return (
    <div className="pb-8">
      <PageHeader title="What's happening">
        Updates from founders on Kickoff: launches, customers, milestones. Written by the founders and not checked like revenue.
      </PageHeader>
      {posts.length ? (
        <PostGrid posts={posts} viewerId={profile?.id} />
      ) : (
        <EmptyState title="No updates yet.">
          {profile?.role === "founder" ? (
            <Link href="/dashboard" className="text-sm text-brand hover:underline">
              Post the first update from your listing page
            </Link>
          ) : (
            <Link href="/marketplace" className="text-sm text-brand hover:underline">
              Browse the marketplace
            </Link>
          )}
        </EmptyState>
      )}
    </div>
  )
}
