/// Deliberately its own file with no "server-only"/"use client" — both the
/// server data layer (queries.ts) and client UI (ComparatorControls, the
/// /comparar page) need this same cap, and importing it from queries.ts
/// would pull that module's "server-only" guard into the client bundle.
export const MAX_COMPARISON_ASSETS = 10
