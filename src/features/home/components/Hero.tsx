"use client"

import Link from "next/link"
import { motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { DashboardMockup } from "@/features/home/components/DashboardMockup"
import { TickerSearch } from "@/features/home/components/TickerSearch"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-24 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 -z-10 flex justify-center"
      >
        <div className="h-[420px] w-[720px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          Ações · FIIs · ETFs em um só lugar
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
        >
          Invista com mais inteligência.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg"
        >
          Dados, análises e ferramentas modernas para acompanhar ações, FIIs e
          ETFs — tudo em um só lugar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 w-full"
        >
          <TickerSearch />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 flex flex-col gap-3 sm:flex-row"
        >
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Começar Gratuitamente
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/mercado" />}
          >
            Explorar mercado
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mx-auto mt-16 max-w-4xl"
      >
        <DashboardMockup />
      </motion.div>
    </section>
  )
}
