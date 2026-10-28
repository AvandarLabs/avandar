import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PracticeToWorkSample.fixtures";
import authoredMetadata from "./PracticeToWorkSample.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./PracticeToWorkSample.controls";
/** Public retrieval copy and bounded interpretation. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["learnerLabel"],
  ["settingLabels", "practice"],
  ["settingLabels", "application"],
  ["task", "instruction"],
  ["task", "unit"],
  ["workpieces", "practiceLabel"],
  ["workpieces", "applicationLabel"],
  ["caption"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.practice-to-work-sample.bindingExample",
      message:
        "In a fictional exercise, Learner A practices marking four centimeters on paper and then tries the same measuring action on a wooden workshop sample.",
    },
    input: DEFAULT_INPUT,
  },
];
