/**
 * Stable references for conceptual graphics, never evidence of product
 * behavior.
 */
export const LEGACY_STOCK_CATEGORIES: readonly [
  "Networks",
  "Data flow",
  "Code",
  "Charts",
  "Interface",
] = ["Networks", "Data flow", "Code", "Charts", "Interface"] as const;
/** A category represented by the legacy stock preset catalog. */
export type LegacyStockCategory = (typeof LEGACY_STOCK_CATEGORIES)[number];
/** Stable preset IDs belonging to the legacy stock catalog. */
export const LEGACY_STOCK_IDS: readonly [
  "network-graph",
  "node-traversal",
  "radial-network",
  "plexus-field",
  "orbital-system",
  "source-merge",
  "data-pipeline",
  "schema-mapping",
  "packet-stream",
  "event-bus",
  "code-focus",
  "terminal-type",
  "scan-lines",
  "bar-race",
  "line-trace",
  "metric-counter",
  "dot-matrix",
  "stagger-cards",
  "word-reveal",
  "status-cycle",
] = [
  "network-graph",
  "node-traversal",
  "radial-network",
  "plexus-field",
  "orbital-system",
  "source-merge",
  "data-pipeline",
  "schema-mapping",
  "packet-stream",
  "event-bus",
  "code-focus",
  "terminal-type",
  "scan-lines",
  "bar-race",
  "line-trace",
  "metric-counter",
  "dot-matrix",
  "stagger-cards",
  "word-reveal",
  "status-cycle",
] as const;
/** A stable ID from the legacy stock preset catalog. */
export type LegacyStockPresetId = (typeof LEGACY_STOCK_IDS)[number];
/** Duration of a stock preset loop, in frames. */
export const STOCK_LOOP_FRAMES = 180 as const;
/** Frame rate of stock preset loops. */
export const STOCK_FPS = 30 as const;
