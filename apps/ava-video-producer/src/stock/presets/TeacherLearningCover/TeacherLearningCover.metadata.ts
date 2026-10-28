import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./TeacherLearningCover.fixtures";
import authoredMetadata from "./TeacherLearningCover.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./TeacherLearningCover.controls";
/** Public retrieval copy without private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for all visible fictional default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["staff", "teacher", "label"],
  ["staff", "cover", "label"],
  ["staff", "mentor", "label"],
  ["learners", 0, "label"],
  ["learners", 1, "label"],
  ["learners", 2, "label"],
  ["learners", 3, "label"],
  ["session", "label"],
  ["session", "prompt"],
  ["roomLabels", "classroom"],
  ["roomLabels", "supportSpace"],
  ["phaseLabels", "cover"],
  ["phaseLabels", "support"],
  ["phaseLabels", "return"],
  ["caption"],
];
/** Complete authored input bound to its fictional source example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.teacher-learning-cover.bindingExample",
      message:
        "A fictional school asks Colleague B to cover four learners while Teacher A rehearses an open question with Mentor C, then Teacher A returns.",
    },
    input: DEFAULT_INPUT,
  },
];
