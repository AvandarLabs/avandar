import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./InterpretedCaseDialogue.fixtures";
import authoredMetadata from "./InterpretedCaseDialogue.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval and display descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for default visible copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "participant"],
  ["people", "worker"],
  ["people", "interpreter"],
  ["languages", "participant"],
  ["languages", "worker"],
  ["turns", 0, "originalText"],
  ["turns", 0, "interpretedText"],
  ["turns", 1, "originalText"],
  ["turns", 1, "interpretedText"],
  ["labels", "original"],
  ["labels", "interpreted"],
  ["labels", "example"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.interpreted-case-dialogue.binding",
      message:
        "In a fictional case conversation, an interpreter conveys the participant's preferred meeting time and the worker's reply while both continue addressing each other.",
    },
    input: defaultInput,
  },
];
