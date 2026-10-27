import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./StaggerCards.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const staggerCardsMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const STAGGER_CARDS_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["cards", 0, "label"],
  ["cards", 0, "detail"],
  ["cards", 1, "label"],
  ["cards", 1, "detail"],
  ["cards", 2, "label"],
  ["cards", 2, "detail"],
  ["cards", 3, "label"],
  ["cards", 3, "detail"],
  ["cards", 4, "label"],
  ["cards", 4, "detail"],
  ["cards", 5, "label"],
  ["cards", 5, "detail"],
  ["heading"],
];
