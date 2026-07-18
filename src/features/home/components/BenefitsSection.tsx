"use client"

import { motion } from "motion/react"
import {
  BarChart3,
  History,
  LayoutDashboard,
  LineChart,
  Scale,
  Wallet,
} from "lucide-react"

import { fadeInUp, staggerContainer } from "@/lib/motion"

const BENEFITS = [
  {
    icon: LayoutDashboard,
    title: "Dashboard inteligente",
    description: "Visão completa do seu patrimônio, rentabilidade e alocação em um único painel.",
  },
  {
    icon: Wallet,
    title: "Carteira",
    description: "Registre suas posições e acompanhe preço médio, lucro e dividendos recebidos.",
  },
  {
    icon: BarChart3,
    title: "Indicadores",
    description: "P/L, P/VP, ROE, ROIC, Dividend Yield e outros fundamentos, sempre atualizados.",
  },
  {
    icon: Scale,
    title: "Comparações",
    description: "Compare ações, FIIs e ETFs lado a lado antes de decidir onde investir.",
  },
  {
    icon: History,
    title: "Histórico de dividendos",
    description: "Veja a evolução de proventos pagos por qualquer ativo ao longo dos anos.",
  },
  {
    icon: LineChart,
    title: "Gráficos modernos",
    description: "Gráficos de preço e performance rápidos, claros e agradáveis de usar.",
  },
]

export function BenefitsSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Tudo que você precisa para investir melhor
          </h2>
          <p className="mt-2 text-muted-foreground">
            Uma base sólida, pensada para crescer com você.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {BENEFITS.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={fadeInUp}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <benefit.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{benefit.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
