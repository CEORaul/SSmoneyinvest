"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
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

  const isDark = mounted && theme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Alternar tema" />}
      >
        {isDark ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" />
          ☀ Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" />
          🌙 Escuro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
