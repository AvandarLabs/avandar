import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./TerminalType.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const terminalTypeMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const TERMINAL_TYPE_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["steps", 0, "text"],
  ["steps", 0, "detail"],
  ["steps", 1, "text"],
  ["steps", 1, "detail"],
  ["steps", 2, "text"],
  ["steps", 2, "detail"],
  ["response"],
  ["title"],
];
