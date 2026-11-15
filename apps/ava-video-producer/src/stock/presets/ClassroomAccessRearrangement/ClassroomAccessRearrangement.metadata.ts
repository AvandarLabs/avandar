import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ClassroomAccessRearrangement.fixtures";
import authoredMetadata from "./ClassroomAccessRearrangement.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ClassroomAccessRearrangement.controls";
/** Public retrieval copy and bounded interpretation. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["learners", 0, "label"],
  ["learners", 1, "label"],
  ["learners", 2, "label"],
  ["learners", 3, "label"],
  ["adaptations", 0, "label"],
  ["adaptations", 1, "label"],
  ["adaptations", 2, "label"],
  ["activity", "label"],
  ["activity", "boardText"],
  ["phaseLabels", "before"],
  ["phaseLabels", "after"],
  ["caption"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.classroom-access-rearrangement.bindingExample",
      message:
        "A fictional classroom clears an approach, opens a shared table, and enlarges the example board text so four represented learners join the same shape activity.",
    },
    input: DEFAULT_INPUT,
  },
];
