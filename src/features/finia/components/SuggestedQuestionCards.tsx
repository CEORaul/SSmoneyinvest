"use client"

import { Button } from "@/components/ui/button"

const SUGGESTED_QUESTIONS = [
  "Como está minha carteira?",
  "Quanto recebi de dividendos este ano?",
  "Qual ativo mais valorizou?",
  "Qual foi minha pior compra?",
  "Quanto investi por setor?",
  "Qual ativo representa maior peso?",
  "Tenho concentração elevada?",
  "Explique meu Score.",
  "Mostrar meus alertas.",
]

interface SuggestedQuestionCardsProps {
  onSelect: (question: string) => void
}

export function SuggestedQuestionCards({ onSelect }: SuggestedQuestionCardsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <Button key={question} variant="outline" size="sm" onClick={() => onSelect(question)}>
          {question}
        </Button>
      ))}
    </div>
  )
}
