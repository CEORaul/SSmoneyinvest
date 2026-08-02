import { FinancialMetric } from "@/features/company/components/metrics/FinancialMetric"
import type { CompanyMetricsSource } from "@/features/company/indicators"
import { cn } from "@/lib/utils"

interface FinancialMetricGridProps {
  dto: CompanyMetricsSource
  indicatorKeys: string[]
  size?: "sm" | "md"
  className?: string
}

/// Responsive grid of FinancialMetric cards for one company — the
/// reusable engine behind any "show N fundamentals side by side" surface
/// (Mercado/Comparador quick views, FinancialHighlights below). Keeping the
/// grid-classing logic in one place means every consumer reorganizes
/// identically at the same breakpoints instead of hand-rolling its own.
export function FinancialMetricGrid({ dto, indicatorKeys, size = "sm", className }: FinancialMetricGridProps) {
  if (indicatorKeys.length === 0) return null

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {indicatorKeys.map((key) => (
        <FinancialMetric key={key} dto={dto} indicatorKey={key} size={size} />
      ))}
    </div>
  )
}
