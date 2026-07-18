"use client"

import Link from "next/link"
import { Menu, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Mercado", href: "/mercado" },
  { label: "Ações", href: "/acoes" },
  { label: "FIIs", href: "/fiis" },
  { label: "ETFs", href: "/etfs" },
  { label: "Preços", href: "/precos" },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        isScrolled
          ? "border-b border-border bg-background/75 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="size-4.5" />
          </span>
          SSmoney Invest
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Entrar
          </Button>
          <Button nativeButton={false} render={<Link href="/register" />}>
            Começar Gratuitamente
          </Button>
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Abrir menu" className="md:hidden" />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <div className="mt-10 flex flex-col gap-1 px-2">
              {NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  render={<Link href={link.href} />}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                >
                  {link.label}
                </SheetClose>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <SheetClose
                  render={<Link href="/login" />}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Entrar
                </SheetClose>
                <SheetClose
                  render={<Link href="/register" />}
                  className={buttonVariants({})}
                >
                  Começar Gratuitamente
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
