"use client"

import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { motion } from "motion/react"

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm"
    >
      <Link
        href="/"
        className="mb-8 flex items-center justify-center gap-2 font-semibold tracking-tight"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TrendingUp className="size-4.5" />
        </span>
        SSmoney Invest
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </motion.div>
  )
}
