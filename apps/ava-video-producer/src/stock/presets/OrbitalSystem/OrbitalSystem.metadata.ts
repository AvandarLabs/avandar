import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./OrbitalSystem.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const orbitalSystemMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const ORBITAL_SYSTEM_DEFAULT_TEXT_PATHS: Array<Array<string | number>> =
  [
    ["bodies", 0, "label"],
    ["bodies", 1, "label"],
    ["bodies", 2, "label"],
  ];
