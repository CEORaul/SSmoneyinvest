import "server-only"

import { runSyncJob } from "@/features/market-sync/run-sync"
import { marketDataService } from "@/services/market-data-service"

/// "Buscar empresas automaticamente" + the baseline periodic price update —
/// both come from the same cheap, unauthenticated bulk endpoint. Meant to
/// run often (e.g. every 15-30min during market hours).
export async function syncCompanyDirectory() {
  return runSyncJob("COMPANY_DIRECTORY", () =>
    marketDataService.refreshCompanyDirectory()
  )
}
