"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

/// Direct two-way toggle — no dropdown, no "system" step in the click
/// interaction. setTheme() persists to localStorage via next-themes, so the
/// choice survives a page reload without any extra wiring.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // Avoids a hydration mismatch: the server always renders the same icon,
  // the real theme is only knowable after mount (next-themes reads it from
  // localStorage/matchMedia client-side).
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // next-themes' own documented pattern for this exact problem — the
    // effect's job IS reporting "client has mounted" to React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // resolvedTheme (not theme) reflects what's actually on screen even when
  // the stored preference is "system" — the icon always matches reality.
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Alternar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
    </Button>
  )
}
