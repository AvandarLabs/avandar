import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PipelineStepSplice.fixtures";
import authoredMetadata from "./PipelineStepSplice.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./PipelineStepSplice.controls";
/** Public retrieval descriptors preserve accepted intent and limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every default display-copy segment. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["title"],
  ["steps", 0, "label"],
  ["steps", 1, "label"],
  ["steps", 2, "label"],
  ["editLabel"],
  ["preview", "inputLabel"],
  ["preview", "inputValue"],
  ["preview", "outputLabel"],
  ["preview", "outputValue"],
];
/** Complete fictional source binding independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.pipeline-step-splice.bindingExamples.0.sourceText",
      message:
        "Insert a trim-spaces operation between reading and saving the fictional location rows.",
    },
    input: DEFAULT_INPUT,
  },
];
