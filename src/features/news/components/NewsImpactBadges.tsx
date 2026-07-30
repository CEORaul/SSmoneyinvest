import { Badge } from "@/components/ui/badge"

interface NewsImpactBadgesProps {
  isOwned: boolean
  isAlerted: boolean
  isFavorited: boolean
}

/// Replaces the old single "Relevante" badge with one pill per list the
/// asset actually belongs to — an article can matter for more than one
/// reason at once (e.g. held AND alerted), so all that apply show
/// side by side rather than collapsing to one generic label.
export function NewsImpactBadges({ isOwned, isAlerted, isFavorited }: NewsImpactBadgesProps) {
  if (!isOwned && !isAlerted && !isFavorited) return null

  return (
    <>
      {isOwned && (
        <Badge variant="outline" className="border-gain/30 bg-gain/10 text-gain">
          Carteira
        </Badge>
      )}
      {isAlerted && <Badge variant="outline">Alertas</Badge>}
      {isFavorited && <Badge variant="outline">Favoritos</Badge>}
    </>
  )
}
