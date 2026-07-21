import { Skeleton } from "@/components/ui/skeleton"

/// This app's first route-level loading.tsx — covers the page's own
/// multi-round-trip Promise.all (company + position + similar companies +
/// dividend history + price series), which is independent of the AI-call
/// Suspense boundary inside CompanySummaryCard (that one covers the AI
/// latency specifically, once this outer shell is already showing).
export default function EmpresaLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
