import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./DotMatrix.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const dotMatrixMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const DOT_MATRIX_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["groups", 0, "label"],
  ["groups", 1, "label"],
  ["heading"],
  ["cohortLabel"],
];
