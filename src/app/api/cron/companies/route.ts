import { NextResponse, type NextRequest } from "next/server"

import { syncCompanyDirectory } from "@/features/market-sync/sync-company-directory"
import { isAuthorizedCronRequest } from "@/features/market-sync/verify-cron-request"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncCompanyDirectory()
  return NextResponse.json(result)
}
