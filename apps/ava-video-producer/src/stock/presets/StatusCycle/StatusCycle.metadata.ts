import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./StatusCycle.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const statusCycleMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const STATUS_CYCLE_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["states", 0, "label"],
  ["states", 0, "detail"],
  ["states", 1, "label"],
  ["states", 1, "detail"],
  ["states", 2, "label"],
  ["states", 2, "detail"],
];
