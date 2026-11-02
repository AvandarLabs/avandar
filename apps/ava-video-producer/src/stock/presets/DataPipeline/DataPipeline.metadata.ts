import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./DataPipeline.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const dataPipelineMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const DATA_PIPELINE_DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["stages", 0, "label"],
  ["stages", 0, "detail"],
  ["stages", 1, "label"],
  ["stages", 1, "detail"],
  ["stages", 2, "label"],
  ["stages", 2, "detail"],
  ["stages", 3, "label"],
  ["stages", 3, "detail"],
  ["heading"],
];
