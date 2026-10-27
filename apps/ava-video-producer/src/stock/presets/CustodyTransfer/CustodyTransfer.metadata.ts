import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./CustodyTransfer.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";

/** Public retrieval copy carries no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
