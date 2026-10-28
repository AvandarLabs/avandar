import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ComputeCapacityConsolidation.fixtures";
import authoredMetadata from "./ComputeCapacityConsolidation.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ComputeCapacityConsolidation.controls";
/** Public retrieval descriptors contain no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["hosts", 0, "label"],
  ["hosts", 1, "label"],
  ["hosts", 2, "label"],
  ["jobs", 0, "label"],
  ["jobs", 1, "label"],
  ["jobs", 2, "label"],
  ["windowLabel"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "before"],
  ["copy", "after"],
  ["copy", "work"],
  ["copy", "occupied"],
  ["copy", "sleep"],
  ["copy", "available"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete binding, never a partial patch. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.compute-capacity-consolidation.bindingExample",
      message:
        "A fictional platform operator repacks three batches totaling 6 CPU-hours onto two hosts and puts the empty third host to sleep.",
    },
    input: DEFAULT_INPUT,
  },
];
