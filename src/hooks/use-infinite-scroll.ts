"use client"

import { useEffect, useRef } from "react"

/// Generic infinite-scroll sentinel — attach the returned ref to an
/// element near the end of a list; `onIntersect` fires once when it enters
/// the viewport (with a 200px lookahead so the next page loads before the
/// user hits the literal bottom). Not News-specific — any feed that needs
/// "load more on scroll" can reuse this instead of a bespoke observer.
export function useInfiniteScrollSentinel(onIntersect: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const onIntersectRef = useRef(onIntersect)

  useEffect(() => {
    onIntersectRef.current = onIntersect
  }, [onIntersect])

  useEffect(() => {
    if (!enabled) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectRef.current()
      },
      { rootMargin: "200px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])

  return sentinelRef
}
