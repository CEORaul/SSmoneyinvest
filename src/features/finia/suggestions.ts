interface SuggestionRule {
  keywords: RegExp
  suggestions: string[]
}

/// Deterministic, topic-keyword follow-ups rather than a second AI call —
/// cheaper, instant, and fully predictable. Matched against the user's
/// question + the assistant's own answer, first rule wins.
const RULES: SuggestionRule[] = [
  {
    keywords: /dividendo/i,
    suggestions: [
      "Qual setor mais paga dividendos?",
      "Qual ativo mais contribuiu com dividendos?",
      "Quanto recebi de dividendos no mês passado?",
    ],
  },
  {
    keywords: /score/i,
    suggestions: ["Explique cada critério do meu Score.", "Como está minha concentração?", "Tenho concentração elevada?"],
  },
  {
    keywords: /concentra[çc][ãa]o|concentrado/i,
    suggestions: ["Qual é minha maior posição?", "Como está a distribuição por setor?", "Explique meu Score."],
  },
  {
    keywords: /setor/i,
    suggestions: ["Quanto investi por setor?", "Tenho concentração setorial elevada?"],
  },
  {
    keywords: /rentabilidade|valoriz|lucro|preju[íi]zo|pior compra/i,
    suggestions: ["Qual ativo mais valorizou?", "Qual foi minha pior compra?", "Como está minha carteira hoje?"],
  },
  {
    keywords: /alerta/i,
    suggestions: ["Mostrar meus alertas.", "Tenho algum alerta disparado?"],
  },
  {
    keywords: /peso|aloca[çc][ãa]o|posi[çc][ãa]o/i,
    suggestions: ["Qual ativo representa maior peso?", "Tenho concentração elevada?"],
  },
]

const DEFAULT_SUGGESTIONS = ["Como está minha carteira?", "Explique meu Score.", "Mostrar meus alertas."]

export function deriveFollowUpSuggestions(userMessage: string, assistantText: string): string[] {
  const combined = `${userMessage} ${assistantText}`
  for (const rule of RULES) {
    if (rule.keywords.test(combined)) return rule.suggestions
  }
  return DEFAULT_SUGGESTIONS
}
