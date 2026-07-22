-- Two new AiContentKind values for the /comparar comparator's AI features
-- (Resumo Executivo, Analisar Comparação) — kept in their own migration
-- file since ALTER TYPE ... ADD VALUE cannot safely share a transaction
-- with other DDL that might reference the new values.
ALTER TYPE "AiContentKind" ADD VALUE 'COMPARISON_SUMMARY';
ALTER TYPE "AiContentKind" ADD VALUE 'COMPARISON_ANALYSIS';
