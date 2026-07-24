"use client"

import { Lock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { UNAVAILABLE_FILTER_MESSAGE, type UnavailableMarketFilterKey } from "@/features/market/discovery-types"

interface UnavailableFilterControlProps {
  filterKey: UnavailableMarketFilterKey
  label: string
}

/// A genuinely interactive control for a filter the spec asks for but that
/// has no real backing data yet (no B3 index-membership sync, no official
/// small-cap/blue-chip classification, no listing-date field — see
/// discovery-types.ts). Clicking it never silently no-ops and never
/// fabricates a result: it explains why, every time, in the same place a
/// real filter would sit — so wiring in a real field later is a one-line
/// swap for this component, not a redesign.
export function UnavailableFilterControl({ label }: UnavailableFilterControlProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="justify-between text-muted-foreground"
      onClick={() => toast.info(`${label}: ${UNAVAILABLE_FILTER_MESSAGE}`)}
    >
      {label}
      <Lock className="size-3.5" />
    </Button>
  )
}
