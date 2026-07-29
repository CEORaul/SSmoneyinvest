import { WatchlistPageClient } from "@/features/watchlist/components/WatchlistPageClient"
import { computeWatchlistStats, getWatchlistItems, getWatchlistsForProfile } from "@/features/watchlist/queries"
import { requireUser } from "@/lib/auth/session"

export default async function WatchlistPage() {
  const profile = await requireUser()

  const [watchlists, stats] = await Promise.all([
    getWatchlistsForProfile(profile.id),
    computeWatchlistStats(profile.id),
  ])

  const initialSelectedId = watchlists[0]?.id ?? null
  const initialItems = initialSelectedId ? await getWatchlistItems(initialSelectedId, profile.id) : []

  return (
    <WatchlistPageClient
      initialWatchlists={watchlists}
      initialSelectedId={initialSelectedId}
      initialItems={initialItems}
      initialStats={stats}
    />
  )
}
