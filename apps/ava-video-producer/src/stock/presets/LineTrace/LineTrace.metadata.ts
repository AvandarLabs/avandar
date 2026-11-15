import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./LineTrace.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const lineTraceMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const LINE_TRACE_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["heading"],
  ["seriesLabel"],
  ["referenceLabel"],
];
