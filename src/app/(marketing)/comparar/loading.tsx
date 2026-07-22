import { Skeleton } from "@/components/ui/skeleton"

/// Covers the page's own Promise.all (companies + batched price history +
/// batched dividend history + portfolio positions), independent of any
/// AI-call Suspense boundary inside the executive summary/analysis panel.
export default function CompararLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
