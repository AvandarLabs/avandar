import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./EventBus.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const eventBusMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const EVENT_BUS_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["producers", 0],
  ["producers", 1],
  ["producers", 2],
  ["subscribers", 0],
  ["subscribers", 1],
  ["subscribers", 2],
  ["heading"],
];
