"use client"

import { Info, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { AiQuestionType } from "@/generated/prisma/client"
import { requestIndicatorExplanationAction } from "@/features/ai/actions"

interface AiIndicatorPopoverProps {
  companyId: string
  indicatorKey: string
  indicatorLabel: string
  /** False when the card itself shows "—"/"Indisponível" or "Sem fonte" —
   * disables the three questions that need a real number, since answering
   * them would mean inventing a value. "O que é?"/"Como calcular?" stay
   * enabled either way (they're definitional, not about this company's data). */
  hasValue: boolean
}

const QUESTIONS: { type: AiQuestionType; label: string; needsValue: boolean }[] = [
  { type: "WHAT_IS", label: "O que é?", needsValue: false },
  { type: "HOW_INTERPRET", label: "Como interpretar?", needsValue: true },
  { type: "IS_HIGH", label: "Está alto?", needsValue: true },
  { type: "COMPARE_SECTOR", label: "Comparar com o setor", needsValue: true },
  { type: "HOW_CALCULATE", label: "Como calcular", needsValue: false },
]

/// Zero free text, ever — every question is one of 5 fixed buttons mapped
/// 1:1 to AiQuestionType. A click is the entire input; the server decides
/// what's real to say based on data it already has (see ai-content-service).
export function AiIndicatorPopover({ companyId, indicatorKey, indicatorLabel, hasValue }: AiIndicatorPopoverProps) {
  const [pendingType, setPendingType] = useState<AiQuestionType | null>(null)
  const [answer, setAnswer] = useState<{ type: AiQuestionType; text: string } | null>(null)
  const [unavailable, setUnavailable] = useState<AiQuestionType | null>(null)

  async function ask(type: AiQuestionType) {
    setPendingType(type)
    setAnswer(null)
    setUnavailable(null)
    const result = await requestIndicatorExplanationAction(companyId, indicatorKey, type)
    setPendingType(null)
    if (result.ok && result.text) {
      setAnswer({ type, text: result.text })
    } else {
      setUnavailable(type)
    }
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          setAnswer(null)
          setUnavailable(null)
          setPendingType(null)
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Explicações de IA sobre ${indicatorLabel}`}
          />
        }
      >
        <Info className="size-3" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="px-1 text-xs font-medium text-muted-foreground">{indicatorLabel}</p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {QUESTIONS.map((question) => {
            const disabledByMissingValue = question.needsValue && !hasValue
            return (
              <Button
                key={question.type}
                variant="outline"
                size="xs"
                onClick={() => ask(question.type)}
                disabled={pendingType !== null || disabledByMissingValue}
                title={disabledByMissingValue ? "Disponível quando este indicador tiver um valor" : undefined}
              >
                {pendingType === question.type && <Loader2 className="size-3 animate-spin" />}
                {question.label}
              </Button>
            )
          })}
        </div>
        {!hasValue && (
          <p className="px-1 text-xs text-muted-foreground">
            Este ativo ainda não tem um valor para &ldquo;{indicatorLabel}&rdquo; nesta fonte — só é
            possível perguntar o que é e como se calcula.
          </p>
        )}
        {answer && (
          <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-xs leading-relaxed text-foreground">
            {answer.text}
          </p>
        )}
        {unavailable && (
          <p className="px-1 text-xs text-muted-foreground">
            Explicação de IA indisponível no momento.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
