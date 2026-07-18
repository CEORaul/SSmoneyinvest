"use client"

import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const NAV_ITEMS = ["Dashboard", "Carteira", "Mercado", "Favoritos"]

const STATS = [
  { label: "Patrimônio", value: "R$ 128.450" },
  { label: "Rentabilidade", value: "+18,4%" },
  { label: "Dividendos (mês)", value: "R$ 842" },
]

const BAR_HEIGHTS = [38, 52, 44, 68, 58, 74, 62, 86, 70, 94]

export function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-loss/50" />
        <span className="size-2.5 rounded-full bg-chart-3/50" />
        <span className="size-2.5 rounded-full bg-gain/50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr]">
        <div className="hidden border-r border-border p-4 sm:block">
          {NAV_ITEMS.map((item, index) => (
            <div
              key={item}
              className={cn(
                "mb-2 rounded-md px-3 py-2 text-xs font-medium",
                index === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border p-3">
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex h-32 items-end gap-1.5 rounded-xl border border-border p-4 sm:h-36">
            {BAR_HEIGHTS.map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.04, ease: "easeOut" }}
                className="flex-1 rounded-t-sm bg-primary/70"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
