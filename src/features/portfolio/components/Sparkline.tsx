"use client"

import { Line, LineChart, ResponsiveContainer } from "recharts"

export interface SparklinePoint {
  date: string
  closeCents: number
}

interface SparklineProps {
  points: SparklinePoint[]
  isGain: boolean
}

/// Minimal per-row trend line — no axes, no grid, no tooltip (the row
/// already shows price/change figures as real numbers; this is purely
/// visual shape). Renders a flat muted dash instead of a fabricated line
/// when there's fewer than 2 real points (manual-entry categories with no
/// market-data provider, or a brand new position).
export function Sparkline({ points, isGain }: SparklineProps) {
  if (points.length < 2) {
    return <div className="h-8 w-20 border-t border-dashed border-muted-foreground/30" />
  }

  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="closeCents"
            stroke={isGain ? "var(--gain)" : "var(--loss)"}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
