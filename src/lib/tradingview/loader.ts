"use client"

/// TradingViewLoader — the ONLY place in this app that ever injects a
/// TradingView `<script>` tag (spec: "Não carregar scripts diretamente nas
/// páginas"). provider.ts is the only caller.
///
/// This is the official free embed-widget pattern
/// (https://www.tradingview.com/widget/): one `<script>` per widget
/// instance, `src` pointed at the specific widget's own embed script, and
/// the widget's JSON config as the script's own text body — the script
/// reads that body itself and renders an iframe into the immediately-
/// preceding sibling element. There is no shared SDK object to load once
/// (that's the *other*, older `tv.js` + `new TradingView.widget(...)`
/// pattern, used only by the Advanced Chart historically) — every widget
/// kind (Advanced Chart, Mini Chart, Market Overview, Stock Heatmap,
/// Ticker Tape) follows this exact same self-contained shape, just with a
/// different script URL and JSON schema, which is what lets this one
/// function serve all of them instead of one injector per widget.

// How long to wait for the script to signal success/failure before treating
// it as unavailable — covers a network that never fires either event (some
// ad-blockers/extensions silently no-op a blocked request instead of
// raising a real error), which is exactly the "widget indisponível" case
// the spec's FALLBACK section calls out by name.
const SCRIPT_TIMEOUT_MS = 8_000

/// Injects one TradingView widget into `container` and resolves once the
/// script has loaded (the most a host page can ever observe about a same-
/// origin-restricted iframe embed like this — what happens *inside* the
/// iframe afterwards is opaque by design). Rejects on a real script load
/// error (no internet, blocked request, DNS failure) or once
/// SCRIPT_TIMEOUT_MS elapses with neither event having fired.
export function injectTradingViewWidget(
  container: HTMLElement,
  scriptSrc: string,
  widgetConfig: Record<string, unknown>
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Required wrapper class per TradingView's own embed markup — the
    // script below mounts its iframe into this specific sibling.
    const widgetSlot = document.createElement("div")
    widgetSlot.className = "tradingview-widget-container__widget"
    container.appendChild(widgetSlot)

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = scriptSrc
    script.async = true
    script.text = JSON.stringify(widgetConfig)

    const timeoutId = window.setTimeout(() => {
      reject(new Error("TradingView: tempo esgotado ao carregar o widget."))
    }, SCRIPT_TIMEOUT_MS)

    script.onload = () => {
      window.clearTimeout(timeoutId)
      resolve()
    }
    script.onerror = () => {
      window.clearTimeout(timeoutId)
      reject(new Error("TradingView: falha ao carregar o script do widget."))
    }

    container.appendChild(script)
  })
}

/// Tears down everything injectTradingViewWidget added — called on unmount
/// and right before a re-mount (ticker/theme change), since none of these
/// free embed widgets have an "update" API of their own (see provider.ts's
/// updateTheme/updateSymbol doc): a fresh mount is the only way to change
/// what any of them show.
export function removeWidget(container: HTMLElement): void {
  container.replaceChildren()
}
