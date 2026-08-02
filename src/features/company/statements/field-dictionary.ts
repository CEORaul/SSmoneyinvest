import type { StatementFieldDef, StatementType } from "@/features/company/statements/types"

export const STATEMENT_LABELS: Record<StatementType, string> = {
  BALANCO: "Balanço Patrimonial",
  DRE: "DRE",
  FLUXO_CAIXA: "Fluxo de Caixa",
  DVA: "DVA",
}

/// The single translation point between a curated Prisma column and its
/// Portuguese row label — add a field here and it appears in the table,
/// nothing is hardcoded per-row in StatementTable itself. Order here is
/// display order, top to bottom.
export const STATEMENT_FIELDS: Record<StatementType, StatementFieldDef[]> = {
  BALANCO: [
    { key: "totalAssetsCents", label: "Ativo Total", unit: "cents" },
    { key: "totalCurrentAssetsCents", label: "Ativo Circulante", unit: "cents" },
    { key: "cashCents", label: "Caixa e Equivalentes", unit: "cents" },
    { key: "intangibleAssetsCents", label: "Intangível", unit: "cents" },
    { key: "goodWillCents", label: "Ágio", unit: "cents" },
    { key: "totalLiabilitiesCents", label: "Passivo Total", unit: "cents" },
    { key: "totalCurrentLiabilitiesCents", label: "Passivo Circulante", unit: "cents" },
    { key: "longTermDebtCents", label: "Dívida de Longo Prazo", unit: "cents" },
    { key: "totalEquityCents", label: "Patrimônio Líquido", unit: "cents" },
    { key: "retainedEarningsCents", label: "Lucros Acumulados", unit: "cents" },
  ],
  DRE: [
    { key: "totalRevenueCents", label: "Receita Líquida", unit: "cents" },
    { key: "costOfRevenueCents", label: "Custo dos Produtos/Serviços", unit: "cents" },
    { key: "grossProfitCents", label: "Lucro Bruto", unit: "cents" },
    { key: "operatingIncomeCents", label: "Resultado Operacional", unit: "cents" },
    { key: "ebitCents", label: "EBIT", unit: "cents" },
    { key: "incomeBeforeTaxCents", label: "Resultado Antes dos Impostos", unit: "cents" },
    { key: "incomeTaxExpenseCents", label: "Imposto de Renda e CSLL", unit: "cents" },
    { key: "netIncomeCents", label: "Lucro Líquido", unit: "cents" },
    { key: "basicEps", label: "LPA Básico", unit: "value" },
    { key: "dilutedEps", label: "LPA Diluído", unit: "value" },
  ],
  FLUXO_CAIXA: [
    { key: "operatingCashFlowCents", label: "Fluxo de Caixa Operacional", unit: "cents" },
    { key: "investmentCashFlowCents", label: "Fluxo de Caixa de Investimento", unit: "cents" },
    { key: "financingCashFlowCents", label: "Fluxo de Caixa de Financiamento", unit: "cents" },
    { key: "freeCashFlowCents", label: "Fluxo de Caixa Livre", unit: "cents" },
    { key: "initialCashBalanceCents", label: "Saldo Inicial de Caixa", unit: "cents" },
    { key: "finalCashBalanceCents", label: "Saldo Final de Caixa", unit: "cents" },
  ],
  DVA: [
    { key: "revenueCents", label: "Receitas", unit: "cents" },
    { key: "grossAddedValueCents", label: "Valor Adicionado Bruto", unit: "cents" },
    { key: "netAddedValueCents", label: "Valor Adicionado Líquido", unit: "cents" },
    { key: "addedValueToDistributeCents", label: "Valor Adicionado a Distribuir", unit: "cents" },
    { key: "teamRemunerationCents", label: "Pessoal", unit: "cents" },
    { key: "taxesCents", label: "Impostos, Taxas e Contribuições", unit: "cents" },
    { key: "equityRemunerationCents", label: "Remuneração de Capitais Próprios", unit: "cents" },
    { key: "dividendsCents", label: "Dividendos", unit: "cents" },
    { key: "retainedEarningsOrLossCents", label: "Lucros Retidos", unit: "cents" },
  ],
}
