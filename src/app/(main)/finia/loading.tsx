import { Skeleton } from "@/components/ui/skeleton"

export default function FiniaLoading() {
  return (
    <div className="grid h-[calc(100vh-9rem)] min-h-[32rem] grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <Skeleton className="hidden rounded-xl md:block" />
      <Skeleton className="rounded-xl" />
    </div>
  )
}
