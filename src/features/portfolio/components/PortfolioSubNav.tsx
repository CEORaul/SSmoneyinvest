import Link from "next/link"

import { Button } from "@/components/ui/button"

const LINKS = [
  { label: "Mercado", href: "/mercado" },
  { label: "Radar", href: "/radar" },
  { label: "Comparar", href: "/comparar" },
]

/// Only shown inside /carteira — Radar and Mercado were removed from the
/// global top-right nav and now surface here instead, alongside Comparar.
export function PortfolioSubNav() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {LINKS.map((link) => (
        <Button key={link.href} variant="ghost" size="sm" nativeButton={false} render={<Link href={link.href} />}>
          {link.label}
        </Button>
      ))}
    </div>
  )
}
