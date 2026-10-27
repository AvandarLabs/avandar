import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./BarRace.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const barRaceMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const BAR_RACE_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["bars", 0, "label"],
  ["bars", 1, "label"],
  ["bars", 2, "label"],
  ["bars", 3, "label"],
  ["heading"],
];
