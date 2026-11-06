import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./BoundaryRegroupingEffect.fixtures";
import authoredMetadata from "./BoundaryRegroupingEffect.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths to authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["cells", 0, "label"],
  ["cells", 1, "label"],
  ["cells", 2, "label"],
  ["cells", 3, "label"],
  ["groupings", 0, "label"],
  ["groupings", 0, "zones", 0, "label"],
  ["groupings", 0, "zones", 1, "label"],
  ["groupings", 1, "label"],
  ["groupings", 1, "zones", 0, "label"],
  ["groupings", 1, "zones", 1, "label"],
  ["copy", "context"],
  ["copy", "total"],
  ["copy", "records"],
  ["copy", "population"],
  ["copy", "per"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.boundary-regrouping-effect.bindingExample",
      message:
        "With the same six fictional records and forty residents, west/east zones each show 15 per 100, while north/south zones show 20 and 10 per 100.",
    },
    input: DEFAULT_INPUT,
  },
];
