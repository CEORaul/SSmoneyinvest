import type { ScoreBucket } from "@/features/portfolio/score/types"
import { cn } from "@/lib/utils"

interface ScoreGaugeProps {
  score: number
  bucket: ScoreBucket
  size?: number
}

// Same 5-bucket palette as CompanyHealthScore.tsx's BUCKET_STYLES — one
// visual language for "a 0-100 score with a qualitative bucket" everywhere
// in the app, not a second one invented for this feature.
const BUCKET_COLOR: Record<ScoreBucket, string> = {
  Excelente: "text-gain",
  Boa: "text-gain",
  Regular: "text-amber-600 dark:text-amber-500",
  Fraca: "text-loss",
  "Muito Fraca": "text-loss",
}

/// A real circular progress ring (plain SVG, no charting library) — no
/// precedent for this existed anywhere in the app before (CompanyHealthScore
/// uses a static ring div with no arc). The transition on strokeDashoffset
/// is the "animação discreta" the spec asks for, done in pure CSS.
export function ScoreGauge({ score, bucket, size = 160 }: ScoreGaugeProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, score)) / 100
  const offset = circumference * (1 - progress)

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", BUCKET_COLOR[bucket])}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--muted)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}
