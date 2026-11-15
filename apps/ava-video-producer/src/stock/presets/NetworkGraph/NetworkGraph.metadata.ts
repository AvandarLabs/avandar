import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./NetworkGraph.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const networkGraphMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const NETWORK_GRAPH_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["nodes", 0, "label"],
  ["nodes", 0, "detail"],
  ["nodes", 1, "label"],
  ["nodes", 2, "label"],
  ["nodes", 3, "label"],
  ["nodes", 4, "label"],
  ["nodes", 5, "label"],
  ["nodes", 6, "label"],
];
