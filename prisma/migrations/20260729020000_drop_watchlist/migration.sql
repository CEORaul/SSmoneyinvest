-- DropTable
-- Monitor de Ativos (Watchlist) was removed as a feature — Alertas covers
-- the same "assets I want to keep an eye on" need. watchlist_items first
-- (FK dependent), then watchlists.
DROP TABLE IF EXISTS "watchlist_items";

-- DropTable
DROP TABLE IF EXISTS "watchlists";
