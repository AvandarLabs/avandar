import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./LocationUncertaintyBoundary.fixtures";
import authoredMetadata from "./LocationUncertaintyBoundary.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths to authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["districts", 0, "label"],
  ["districts", 1, "label"],
  ["locations", 0, "label"],
  ["locations", 1, "label"],
  ["locations", 2, "label"],
  ["copy", "context"],
  ["copy", "nominal"],
  ["copy", "possible"],
  ["copy", "definite"],
  ["copy", "unresolved"],
  ["copy", "total"],
  ["copy", "unit"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.location-uncertainty-boundary.bindingExample",
      message:
        "One of three fictional locations has a possible-position footprint crossing the west/east boundary, so its district assignment remains unresolved.",
    },
    input: DEFAULT_INPUT,
  },
];
