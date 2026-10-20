import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./AtomicOutboxCommit.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
/** Public retrieval descriptors without private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
