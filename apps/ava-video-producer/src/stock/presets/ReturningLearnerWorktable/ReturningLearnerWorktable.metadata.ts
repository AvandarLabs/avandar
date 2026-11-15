import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ReturningLearnerWorktable.fixtures";
import authoredMetadata from "./ReturningLearnerWorktable.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ReturningLearnerWorktable.controls";
/** Public retrieval copy without private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for all visible fictional default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "learner"],
  ["people", "teacher"],
  ["periodLabels", "before"],
  ["periodLabels", "interruption"],
  ["periodLabels", "return"],
  ["priorWork", 0, "label"],
  ["priorWork", 1, "label"],
  ["returnActivities", 0, "label"],
  ["returnActivities", 1, "label"],
  ["activityLabels", "retained"],
  ["activityLabels", "review"],
  ["activityLabels", "new"],
  ["caption"],
];
/** Complete authored input bound to its fictional source example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.returning-learner-worktable.bindingExample",
      message:
        "In a fictional return session, Learner A brings earlier shape and number work, revisits one familiar activity with a teacher, and tries one new activity.",
    },
    input: DEFAULT_INPUT,
  },
];
