"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"

export function TickerSearch() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const ticker = value.trim().toUpperCase()
    if (!ticker) return
    router.push(`/empresa/${ticker}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-lg items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm transition-shadow focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
    >
      <Search className="ml-3 size-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar ação, FII ou ETF... (ex: PETR4)"
        aria-label="Buscar ativo"
        className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button type="submit" size="sm" className="rounded-full px-4">
        Buscar
      </Button>
    </form>
  )
}
