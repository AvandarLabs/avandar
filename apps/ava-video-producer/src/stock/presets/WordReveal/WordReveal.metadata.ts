import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./WordReveal.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const wordRevealMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const WORD_REVEAL_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["words", 0, "word"],
  ["words", 1, "word"],
  ["words", 2, "word"],
];
