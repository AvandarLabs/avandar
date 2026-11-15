import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./GisLayerIntersectionTally.fixtures";
import authoredMetadata from "./GisLayerIntersectionTally.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./GisLayerIntersectionTally.controls";
/** Public retrieval copy and bounded interpretation. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["layers", 0, "label"],
  ["layers", 1, "label"],
  ["households", 0, "label"],
  ["households", 1, "label"],
  ["households", 2, "label"],
  ["households", 3, "label"],
  ["copy", "context"],
  ["copy", "intersection"],
  ["copy", "difference"],
  ["copy", "selected"],
  ["copy", "total"],
  ["copy", "households"],
  ["copy", "members"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.gis-layer-intersection-tally.bindingExample",
      message:
        "In the fictional overlay, three of eight supplied residents live inside both demo zones.",
    },
    input: DEFAULT_INPUT,
  },
];
