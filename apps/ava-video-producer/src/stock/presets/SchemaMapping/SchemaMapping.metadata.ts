import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./SchemaMapping.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public metadata and the limits of this bounded authored study. */
export const schemaMappingMetadata: StockMetadata =
  parseStockMetadata(authoredMetadata);

/** Explicit visible example-copy paths. IDs, colors and code are excluded. */
export const SCHEMA_MAPPING_DEFAULT_TEXT_PATHS: Array<Array<string | number>> =
  [
    ["mappings", 0, "source"],
    ["mappings", 0, "target"],
    ["mappings", 0, "type"],
    ["mappings", 1, "source"],
    ["mappings", 1, "target"],
    ["mappings", 1, "type"],
    ["mappings", 2, "source"],
    ["mappings", 2, "target"],
    ["mappings", 2, "type"],
    ["mappings", 3, "source"],
    ["mappings", 3, "target"],
    ["mappings", 3, "type"],
    ["sourceLabel"],
    ["targetLabel"],
  ];
