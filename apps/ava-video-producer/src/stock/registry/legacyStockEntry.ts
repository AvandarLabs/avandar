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
export type LegacyStockCategory = (typeof LEGACY_STOCK_CATEGORIES)[number];
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
export type LegacyStockPresetId = (typeof LEGACY_STOCK_IDS)[number];
export const STOCK_LOOP_FRAMES = 180 as const;
export const STOCK_FPS = 30 as const;
