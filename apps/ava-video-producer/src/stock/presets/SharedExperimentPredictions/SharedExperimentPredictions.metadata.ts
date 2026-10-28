import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SharedExperimentPredictions.fixtures";
import authoredMetadata from "./SharedExperimentPredictions.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./SharedExperimentPredictions.controls";
/** Public retrieval copy and bounded interpretation. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["learners", 0, "label"],
  ["learners", 1, "label"],
  ["learners", 2, "label"],
  ["track", "unit"],
  ["labels", "experiment"],
  ["labels", "prediction"],
  ["labels", "observation"],
  ["labels", "origin"],
  ["caption"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.shared-experiment-predictions.bindingExample",
      message:
        "In a fictional tabletop exercise, three learners predict stopping distances of 12, 20, and 28 example centimeters, then compare them with an authored observation of 18.",
    },
    input: DEFAULT_INPUT,
  },
];
