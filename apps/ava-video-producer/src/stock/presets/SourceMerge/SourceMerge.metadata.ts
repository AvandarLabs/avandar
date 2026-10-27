import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./SourceMerge.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const sourceMergeMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const SOURCE_MERGE_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["sources", 0, "name"],
  ["sources", 0, "kind"],
  ["sources", 1, "name"],
  ["sources", 1, "kind"],
  ["sources", 2, "name"],
  ["sources", 2, "kind"],
  ["destination", "label"],
  ["destination", "detail"],
];
