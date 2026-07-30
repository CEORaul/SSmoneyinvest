"use client"

/// TradingViewLoader — scaffolding for the future on-demand script load
/// (spec's LAZY LOADING section: a widget/library script must load only
/// once, and only when a page actually renders a TradingView component —
/// never eagerly on app boot). Nothing here injects a script yet; this
/// phase is structure only, per the spec's own "NÃO adicionar scripts
/// externos" constraint.
///
/// The real implementation (once a provider is chosen) will inject a
/// `<script>` tag — or use next/script's lazyOnload strategy — and resolve
/// once TradingView's own global object is available; this module is the
/// one place provider.ts will call into for that, so no component ever
/// injects a script directly.

let loadPromise: Promise<void> | null = null

/// Always resolves immediately today — memoized so a real implementation
/// only ever injects the script once, no matter how many components ask
/// for it concurrently.
export function loadTradingViewScript(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.resolve()
  }
  return loadPromise
}

/// Always false today (no script exists yet). A real implementation would
/// check `typeof window !== "undefined" && "TradingView" in window`.
export function isTradingViewScriptLoaded(): boolean {
  return false
}
