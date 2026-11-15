import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./RetryBackoff.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
