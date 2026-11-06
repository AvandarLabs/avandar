import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./FieldConflictChoice.fixtures";
import authoredMetadata from "./FieldConflictChoice.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./FieldConflictChoice.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for supplied display copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["recordTitle"],
  ["sources", 0, "label"],
  ["sources", 1, "label"],
  ["fields", 0, "label"],
  ["fields", 0, "candidates", 0, "value"],
  ["fields", 0, "candidates", 1, "value"],
  ["fields", 1, "label"],
  ["fields", 1, "candidates", 0, "value"],
  ["fields", 1, "candidates", 1, "value"],
  ["labels", "result"],
  ["labels", "selected"],
  ["labels", "unresolved"],
  ["labels", "alternatives"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.field-conflict-choice.bindingExamples.0.sourceText",
      message:
        "For the fictional item, keep the register name but leave the conflicting locations open for review.",
    },
    input: DEFAULT_INPUT,
  },
];
