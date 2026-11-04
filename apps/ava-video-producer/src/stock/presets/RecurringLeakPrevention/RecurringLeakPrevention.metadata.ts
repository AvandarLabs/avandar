import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import authoredMetadata from "./RecurringLeakPrevention.metadata.yaml";
import type { StockMetadata } from "../../contracts/StockContract.types";
/** Faithful public retrieval copy excludes private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
