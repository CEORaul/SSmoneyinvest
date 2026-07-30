"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

/// Fires once when the attached element first enters the viewport, then
/// disconnects — unlike use-infinite-scroll's useInfiniteScrollSentinel
/// (which keeps observing to trigger repeated "load more" calls), this is
/// for a genuine one-time lazy-mount decision (e.g. TradingViewAdvancedChart
/// only injecting its script once the chart scrolls into view). Returns
/// boolean state rather than a callback, since callers need "has become
/// visible" to drive conditional rendering, not just a side effect.
export function useIsVisibleOnce<T extends Element>(rootMargin = "200px"): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  return [ref, isVisible]
}
