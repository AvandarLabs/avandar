import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PublicationSnapshotSlice.fixtures";
import authoredMetadata from "./PublicationSnapshotSlice.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./PublicationSnapshotSlice.controls";
/** Public retrieval metadata excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["table", "columns", 0, "label"],
  ["table", "columns", 1, "label"],
  ["table", "columns", 2, "label"],
  ["table", "rows", 0, "cells", 0],
  ["table", "rows", 0, "cells", 1],
  ["table", "rows", 0, "cells", 2],
  ["table", "rows", 1, "cells", 0],
  ["table", "rows", 1, "cells", 1],
  ["table", "rows", 1, "cells", 2],
  ["liveEdit", "value"],
  ["publication", "revision"],
  ["publication", "label"],
  ["copy", "context"],
  ["copy", "source"],
  ["copy", "result"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.publication-snapshot-slice.bindingExamples.0.sourceText",
      message:
        "Publish Site and Items for West 12 and East 8 to an internal Revision 1 snapshot. Exclude Internal note. A later West edit to 15 changes only the live table.",
    },
    input: DEFAULT_INPUT,
  },
];
