import "server-only"

import type { NextRequest } from "next/server"

/// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on every
/// invocation. Verifying it stops anyone who finds the route URL from
/// triggering a sync job on demand.
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}
