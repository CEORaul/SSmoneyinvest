import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Vercel's Supabase integration auto-provisions POSTGRES_PRISMA_URL/POSTGRES_URL
// pointed at the pooled Supavisor endpoint; the direct db.<ref>.supabase.co
// host behind DATABASE_URL is frequently unreachable from Vercel's serverless
// functions (P1001) because it's IPv6-only unless the project has the IPv4
// add-on. Prefer the pooled string when present, fall back to DATABASE_URL
// for local dev.
function resolveConnectionString(): string | undefined {
  const raw =
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL
  if (!raw) return raw

  // Supabase's pooled connection strings ship with sslmode=require, which
  // newer pg-connection-string versions treat as full chain verification —
  // that fails against Supabase's cert chain (P1011). sslmode=no-verify
  // keeps the connection encrypted but relaxes chain verification.
  try {
    const url = new URL(raw)
    url.searchParams.set("sslmode", "no-verify")
    return url.toString()
  } catch {
    return raw
  }
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: resolveConnectionString() })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
