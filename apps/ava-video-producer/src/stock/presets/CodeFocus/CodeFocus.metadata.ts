import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./CodeFocus.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const codeFocusMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const CODE_FOCUS_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["title"],
  ["footer"],
];
