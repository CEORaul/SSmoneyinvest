"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  runCompanyDetailsSyncAction,
  runCompanyDirectorySyncAction,
  type SyncActionResult,
} from "@/features/admin/actions"

type JobKey = "directory" | "details"

const JOB_LABELS: Record<JobKey, string> = {
  directory: "Diretório de empresas (preços/listagem)",
  details: "Detalhes por lote (dividendos/histórico/fundamentos)",
}

/// Both buttons call the exact same functions the (currently cron-less)
/// /api/cron/companies and /api/cron/company-details routes call — see
/// src/features/admin/actions.ts. No sync logic lives here or in the
/// actions file itself, only the trigger + result display.
export function SyncPanel() {
  const [running, setRunning] = useState<JobKey | null>(null)
  const [results, setResults] = useState<Partial<Record<JobKey, SyncActionResult>>>({})

  async function runJob(job: JobKey) {
    setRunning(job)
    const action = job === "directory" ? runCompanyDirectorySyncAction : runCompanyDetailsSyncAction
    const result = await action()
    setRunning(null)
    setResults((current) => ({ ...current, [job]: result }))

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível concluir a sincronização")
      return
    }
    toast.success(
      `${JOB_LABELS[job]}: ${result.processed} processada(s), ${result.failed} falha(s)`
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sincronizar Mercado</p>
            <p className="text-sm text-muted-foreground">
              {JOB_LABELS.directory} — o mesmo job de /api/cron/companies.
            </p>
          </div>
          <Button
            onClick={() => runJob("directory")}
            loading={running === "directory"}
            disabled={running !== null}
          >
            Sincronizar Mercado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sincronizar detalhes</p>
            <p className="text-sm text-muted-foreground">
              {JOB_LABELS.details} — o mesmo job de /api/cron/company-details.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => runJob("details")}
            loading={running === "details"}
            disabled={running !== null}
          >
            Sincronizar detalhes
          </Button>
        </CardContent>
      </Card>

      {(["directory", "details"] as const).map((job) => {
        const result = results[job]
        if (!result) return null
        return (
          <Card key={job}>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{JOB_LABELS[job]} — último resultado</p>
              {result.ok ? (
                <>
                  <p className="text-muted-foreground">
                    {result.processed} processada(s), {result.failed} falha(s)
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-destructive">
                      {result.errors.slice(0, 10).map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-destructive">{result.error}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
