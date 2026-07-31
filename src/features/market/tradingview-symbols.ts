import type { ChartRequestSymbol } from "@/lib/tradingview/chart-service"
import type { MarketOverviewTab } from "@/components/tradingview/TradingViewMarketOverview"

/// Static TradingView symbol configuration for Mercado 2.0 — every value
/// here is a real TradingView symbol string (best-effort verified; a few
/// low-confidence entries are flagged below for follow-up), never app
/// data. Kept in one file so Mercado's section components import from a
/// single source instead of hardcoding symbol strings inline.

/// Ticker Tape — top-of-page strip. B3 tickers are real Company rows
/// (assetClass resolves their BMFBOVESPA exchange via
/// resolveExchangeForAssetClass); IBOV/IFIX/BTC/ETH/Dólar have no
/// Company row so they carry an explicit tradingViewSymbol override.
export const TICKER_TAPE_SYMBOLS: ChartRequestSymbol[] = [
  { ticker: "IBOV", tradingViewSymbol: "BMFBOVESPA:IBOV" },
  { ticker: "IFIX", tradingViewSymbol: "BMFBOVESPA:IFIX" },
  { ticker: "PETR4", assetClass: "STOCK" },
  { ticker: "VALE3", assetClass: "STOCK" },
  { ticker: "ITUB4", assetClass: "STOCK" },
  { ticker: "BBAS3", assetClass: "STOCK" },
  { ticker: "WEGE3", assetClass: "STOCK" },
  { ticker: "BBDC4", assetClass: "STOCK" },
  { ticker: "MXRF11", assetClass: "FII" },
  { ticker: "BTC", tradingViewSymbol: "COINBASE:BTCUSD" },
  { ticker: "ETH", tradingViewSymbol: "COINBASE:ETHUSD" },
  { ticker: "USDBRL", tradingViewSymbol: "FX_IDC:USDBRL" },
]

/// Market Overview — the widget's own internal tab switcher.
export const MARKET_OVERVIEW_TABS: MarketOverviewTab[] = [
  {
    title: "Brasil",
    symbols: [
      { s: "BMFBOVESPA:IBOV", d: "Ibovespa" },
      { s: "BMFBOVESPA:IFIX", d: "IFIX" },
      { s: "BMFBOVESPA:PETR4", d: "Petrobras" },
      { s: "BMFBOVESPA:VALE3", d: "Vale" },
      { s: "BMFBOVESPA:ITUB4", d: "Itaú" },
      { s: "FX_IDC:USDBRL", d: "Dólar" },
    ],
  },
  {
    title: "Estados Unidos",
    symbols: [
      { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
      { s: "NASDAQ:NDX", d: "Nasdaq 100" },
      { s: "AMEX:DIA", d: "Dow Jones" },
      { s: "NASDAQ:AAPL", d: "Apple" },
      { s: "NASDAQ:MSFT", d: "Microsoft" },
    ],
  },
  {
    title: "Europa",
    symbols: [
      { s: "XETR:DAX", d: "DAX" },
      { s: "EURONEXT:PX1", d: "CAC 40" },
      { s: "LSE:UKX", d: "FTSE 100" },
    ],
  },
  {
    title: "Cripto",
    symbols: [
      { s: "COINBASE:BTCUSD", d: "Bitcoin" },
      { s: "COINBASE:ETHUSD", d: "Ethereum" },
      { s: "COINBASE:SOLUSD", d: "Solana" },
      { s: "BINANCE:BNBUSDT", d: "BNB" },
      { s: "COINBASE:XRPUSD", d: "XRP" },
      { s: "COINBASE:ADAUSD", d: "Cardano" },
    ],
  },
  {
    title: "Forex",
    symbols: [
      { s: "FX_IDC:USDBRL", d: "USD/BRL" },
      { s: "FX:EURUSD", d: "EUR/USD" },
      { s: "FX:GBPUSD", d: "GBP/USD" },
      { s: "FX_IDC:EURBRL", d: "EUR/BRL" },
    ],
  },
]

export interface HeatmapConfig {
  kind: "HEATMAP" | "CRYPTO_HEATMAP"
  dataSource: string
}

/// Heatmap category tabs — Mercado 2.0's own tab UI decides which config
/// (or honest fallback) to render per tab.
///
/// CRIPTO uses TradingView's dedicated Crypto Coins Heatmap widget (a
/// DIFFERENT free widget/script than the Stock Heatmap, not the same one
/// with a "Crypto" dataSource — that value doesn't exist on the stock
/// widget; feeding it there is what silently rendered a US stock universe
/// before this was fixed). ACOES/FIIS/ETFS stay null: TradingView's free
/// Stock Heatmap widget has no confirmed Brazil-only `dataSource` universe
/// (its named universes are US/global indices — "SPX500", "AllUSA", etc.),
/// and its `exchanges` filter narrows WITHIN a chosen dataSource rather
/// than replacing it, so pairing it with "BMFBOVESPA" while dataSource
/// stays US-scoped would just render empty — the exact same class of
/// silent-wrong-data bug this file's CRIPTO fix just corrected. Left as
/// documented uncertainty rather than a second guess.
export const HEATMAP_DATA_SOURCES: Record<"ACOES" | "FIIS" | "ETFS" | "CRIPTO", HeatmapConfig | null> = {
  ACOES: null,
  FIIS: null,
  ETFS: null,
  CRIPTO: { kind: "CRYPTO_HEATMAP", dataSource: "Crypto" },
}

/// Índices — real market indices with no Company row in this app, so the
/// only honest way to show them is TradingView's own Mini Chart widget.
/// NASDAQ/DOW/DAX/NIKKEI symbols are best-effort (flagged in the final
/// report as worth a follow-up verification pass).
export const MARKET_INDICES: { label: string; ticker: string; tradingViewSymbol: string }[] = [
  { label: "IBOVESPA", ticker: "IBOV", tradingViewSymbol: "BMFBOVESPA:IBOV" },
  { label: "IFIX", ticker: "IFIX", tradingViewSymbol: "BMFBOVESPA:IFIX" },
  { label: "S&P 500", ticker: "SPX", tradingViewSymbol: "FOREXCOM:SPXUSD" },
  { label: "NASDAQ", ticker: "NDX", tradingViewSymbol: "NASDAQ:NDX" },
  { label: "DOW JONES", ticker: "DJI", tradingViewSymbol: "AMEX:DIA" },
  { label: "DAX", ticker: "DAX", tradingViewSymbol: "XETR:DAX" },
  { label: "NIKKEI 225", ticker: "NI225", tradingViewSymbol: "TVC:NI225" },
]

/// Criptomoedas — same reasoning as MARKET_INDICES: no real price data for
/// these in the app's own DB (AssetClass.CRYPTO.hasMarketData is false),
/// so every row is a live Mini Chart. BNB uses Binance since Coinbase has
/// no BNB/USD pair (also flagged for follow-up verification).
export const MARKET_CRYPTO: { label: string; ticker: string; tradingViewSymbol: string }[] = [
  { label: "Bitcoin", ticker: "BTC", tradingViewSymbol: "COINBASE:BTCUSD" },
  { label: "Ethereum", ticker: "ETH", tradingViewSymbol: "COINBASE:ETHUSD" },
  { label: "Solana", ticker: "SOL", tradingViewSymbol: "COINBASE:SOLUSD" },
  { label: "BNB", ticker: "BNB", tradingViewSymbol: "BINANCE:BNBUSDT" },
  { label: "XRP", ticker: "XRP", tradingViewSymbol: "COINBASE:XRPUSD" },
  { label: "Cardano", ticker: "ADA", tradingViewSymbol: "COINBASE:ADAUSD" },
]
