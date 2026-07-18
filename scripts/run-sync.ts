import "dotenv/config"

const JOB_PATHS = {
  companies: "/api/cron/companies",
  "company-details": "/api/cron/company-details",
} as const

async function main() {
  const jobName = process.argv[2] as keyof typeof JOB_PATHS | undefined
  const path = jobName && JOB_PATHS[jobName]

  if (!path) {
    console.error(`Uso: tsx scripts/run-sync.ts <${Object.keys(JOB_PATHS).join("|")}>`)
    console.error("Requer o dev server rodando (npm run dev) e CRON_SECRET no .env.")
    process.exit(1)
  }

  const baseUrl = process.env.SYNC_BASE_URL ?? "http://localhost:3000"
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("CRON_SECRET não definido no .env")
    process.exit(1)
  }

  console.log(`Chamando ${baseUrl}${path}...`)
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = await response.json()
  console.log(response.status, JSON.stringify(body, null, 2))
  process.exit(response.ok ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
