"use client"

import type { ReactNode } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TradingViewAdvancedChart } from "@/components/tradingview/TradingViewAdvancedChart"

interface TradingViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticker: string
  /// Passed straight through to TradingViewAdvancedChart — the existing
  /// chart to show in expanded/fullscreen mode while no provider exists.
  fallback?: ReactNode
}

/// Fullscreen/expanded chart view — reuses the existing shadcn Dialog (no
/// new library), wrapping TradingViewAdvancedChart rather than duplicating
/// its fallback logic. This is the future "expand chart" entry point (e.g.
/// a maximize button on /empresa/[ticker]); not wired into any page yet
/// (see src/lib/tradingview/integration-map.ts).
export function TradingViewModal({ open, onOpenChange, ticker, fallback }: TradingViewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{ticker}</DialogTitle>
        </DialogHeader>
        <TradingViewAdvancedChart ticker={ticker} height={520} fallback={fallback} />
      </DialogContent>
    </Dialog>
  )
}
