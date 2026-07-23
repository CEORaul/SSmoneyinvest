import { Skeleton } from "@/components/ui/skeleton"

export default function RadarLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
