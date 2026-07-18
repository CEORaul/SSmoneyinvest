import Link from "next/link"

import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="px-6 py-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-8 py-16 text-center sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center"
        >
          <div className="h-64 w-[520px] rounded-full bg-primary/25 blur-3xl" />
        </div>

        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Comece a acompanhar seus investimentos hoje
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Gratuito para começar. Leva menos de um minuto para criar sua conta.
        </p>

        <div className="mt-8 flex justify-center">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Começar Gratuitamente
          </Button>
        </div>
      </div>
    </section>
  )
}
