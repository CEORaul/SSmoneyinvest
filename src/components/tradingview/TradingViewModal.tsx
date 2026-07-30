"use client"

import type { ReactNode } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TradingViewAdvancedChart } from "@/components/tradingview/TradingViewAdvancedChart"
import type { AssetClass } from "@/generated/prisma/client"

interface TradingViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticker: string
  assetClass: AssetClass
  /// Passed straight through to TradingViewAdvancedChart — the existing
  /// chart to show if TradingView is disabled or fails to load.
  fallback?: ReactNode
}

/// Fullscreen/expanded chart view — reuses the existing shadcn Dialog (no
/// new library), wrapping TradingViewAdvancedChart rather than duplicating
/// its mount/fallback logic. This is the future "expand chart" entry point
/// (e.g. a maximize button on /empresa/[ticker]); not wired into any page
/// yet (see src/lib/tradingview/integration-map.ts).
export function TradingViewModal({ open, onOpenChange, ticker, assetClass, fallback }: TradingViewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{ticker}</DialogTitle>
        </DialogHeader>
        <TradingViewAdvancedChart ticker={ticker} assetClass={assetClass} fallback={fallback} />
      </DialogContent>
    </Dialog>
  )
}
