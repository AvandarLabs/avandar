import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./StatePreservingSourceRefresh.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
/** Public retrieval descriptors with no private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
