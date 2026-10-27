import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ProtectedWorkBoundary.fixtures";
import authoredMetadata from "./ProtectedWorkBoundary.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ProtectedWorkBoundary.controls";
/** Public descriptors with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored default prose path, including nested review copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["slots", 0, "label"],
  ["slots", 0, "workLabel"],
  ["slots", 1, "label"],
  ["slots", 1, "workLabel"],
  ["slots", 2, "label"],
  ["slots", 3, "label"],
  ["request", "label"],
  ["workerLabel"],
  ["labels", "work"],
  ["labels", "rest"],
  ["labels", "learning"],
  ["labels", "community"],
  ["labels", "protected"],
  ["labels", "deferred"],
  ["labels", "rescheduled"],
  ["labels", "unit"],
  ["labels", "example"],
];
/** Complete authored example, preserved verbatim. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.protected-work-boundary.binding",
      message:
        "In a fictional team schedule, two blocks already contain work and two are reserved for rest and learning. A new review is explicitly deferred rather than placed over the rest block.",
    },
    input: DEFAULT_INPUT,
  },
];
