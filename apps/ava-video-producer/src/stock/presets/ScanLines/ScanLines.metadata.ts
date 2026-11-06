import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./ScanLines.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const scanLinesMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const SCAN_LINES_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["fields", 0],
  ["fields", 1],
  ["fields", 2],
  ["fields", 3],
  ["fields", 4],
  ["fields", 5],
];
