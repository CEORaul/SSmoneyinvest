"use client"

import { useEffect, useState } from "react"

/// Generic — any component that needs a CSS-breakpoint-driven behavior
/// (e.g. the notification bell switching Sheet side="bottom" on mobile)
/// reuses this instead of a bespoke resize listener. The lazy useState
/// initializer reads the real value on first client render (SSR has no
/// `window`, hence the guard) — the effect only subscribes to future
/// changes, never sets state synchronously in its own body.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches))

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    // Resyncs if `query` itself changes across renders — the lazy
    // initializer above only runs once, on mount, for the first query.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local state to an external system (matchMedia), not a derived value
    setMatches(mediaQueryList.matches)

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches)
    }

    mediaQueryList.addEventListener("change", handleChange)
    return () => mediaQueryList.removeEventListener("change", handleChange)
  }, [query])

  return matches
}
