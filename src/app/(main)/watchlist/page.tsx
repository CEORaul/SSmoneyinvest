import { WatchlistPageClient } from "@/features/watchlist/components/WatchlistPageClient"
import { computeWatchlistStats, getWatchlistItems, getWatchlistsForProfile } from "@/features/watchlist/queries"
import { requireUser } from "@/lib/auth/session"

// "Analisar Monitor de Ativos" calls Gemini via a Server Action on this
// page — raises the default function timeout so a slow-but-successful call
// isn't killed mid-flight (Server Action maxDuration is set at the page
// level per Next.js docs, not on the action itself).
export const maxDuration = 30

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
