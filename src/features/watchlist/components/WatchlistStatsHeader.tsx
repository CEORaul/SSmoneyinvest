"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PriceChangeTag } from "@/components/shared/PriceChangeTag"
import { TickerBadge } from "@/components/shared/TickerBadge"
import { getAssetCategoryMeta } from "@/features/portfolio/asset-category"
import type { WatchlistStats } from "@/features/watchlist/types"

interface WatchlistStatsHeaderProps {
  stats: WatchlistStats
}

/// Aggregated across every list the profile owns (see computeWatchlistStats)
/// — always visible at the top of /watchlist regardless of which single
/// list is currently selected below.
export function WatchlistStatsHeader({ stats }: WatchlistStatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">Listas</p>
          <p className="text-xl font-semibold tabular-nums">{stats.listCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">Ativos acompanhados</p>
          <p className="text-xl font-semibold tabular-nums">{stats.totalAssetCount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">Maior alta do dia</p>
          {stats.topGainer ? (
            <div className="flex items-center gap-2">
              <TickerBadge ticker={stats.topGainer.ticker} logoUrl={stats.topGainer.logoUrl} size="sm" />
              <div>
                <p className="text-sm font-medium">{stats.topGainer.ticker}</p>
                <PriceChangeTag changePct={stats.topGainer.changePct} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">Maior baixa do dia</p>
          {stats.topLoser ? (
            <div className="flex items-center gap-2">
              <TickerBadge ticker={stats.topLoser.ticker} logoUrl={stats.topLoser.logoUrl} size="sm" />
              <div>
                <p className="text-sm font-medium">{stats.topLoser.ticker}</p>
                <PriceChangeTag changePct={stats.topLoser.changePct} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">Alertas ativos</p>
          <p className="text-xl font-semibold tabular-nums">{stats.activeAlertsCount}</p>
        </CardContent>
      </Card>

      {stats.classDistribution.length > 0 && (
        <Card className="col-span-2 sm:col-span-3 lg:col-span-5">
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Distribuição por classe</p>
            <div className="flex flex-wrap gap-2">
              {stats.classDistribution.map((entry) => {
                const meta = getAssetCategoryMeta(entry.assetClass)
                return (
                  <Badge key={entry.assetClass} variant="outline" className="gap-1">
                    <span>{meta.emoji}</span>
                    {meta.label}: {entry.count}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
