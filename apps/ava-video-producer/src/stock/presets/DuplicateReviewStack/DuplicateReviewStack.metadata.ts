import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./DuplicateReviewStack.fixtures";
import authoredMetadata from "./DuplicateReviewStack.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./DuplicateReviewStack.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for supplied display copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["title"],
  ["groups", 0, "label"],
  ["groups", 0, "records", 0, "id"],
  ["groups", 0, "records", 0, "label"],
  ["groups", 0, "records", 0, "comparisonValue"],
  ["groups", 0, "records", 1, "id"],
  ["groups", 0, "records", 1, "label"],
  ["groups", 0, "records", 1, "comparisonValue"],
  ["groups", 1, "label"],
  ["groups", 1, "records", 0, "id"],
  ["groups", 1, "records", 0, "label"],
  ["groups", 1, "records", 0, "comparisonValue"],
  ["groups", 1, "records", 1, "id"],
  ["groups", 1, "records", 1, "label"],
  ["groups", 1, "records", 1, "comparisonValue"],
  ["comparisonFieldLabel"],
  ["labels", "retained"],
  ["labels", "unresolved"],
  ["labels", "alternatives"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.duplicate-review-stack.bindingExamples.0.sourceText",
      message:
        "Review the fictional duplicate candidates, retain A1 for the paper group, and leave the ink group undecided.",
    },
    input: DEFAULT_INPUT,
  },
];
