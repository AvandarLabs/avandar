import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./RadialNetwork.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const radialNetworkMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const RADIAL_NETWORK_DEFAULT_TEXT_PATHS: Array<Array<string | number>> =
  [
    ["hub", "label"],
    ["hub", "detail"],
    ["spokes", 0],
    ["spokes", 1],
    ["spokes", 2],
    ["spokes", 3],
    ["spokes", 4],
    ["spokes", 5],
    ["spokes", 6],
    ["spokes", 7],
  ];
