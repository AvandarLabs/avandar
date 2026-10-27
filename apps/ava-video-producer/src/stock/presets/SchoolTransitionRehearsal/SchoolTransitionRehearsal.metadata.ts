import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./SchoolTransitionRehearsal.fixtures";
import authoredMetadata from "./SchoolTransitionRehearsal.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval and display descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for default visible copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "learner"],
  ["people", "companion"],
  ["stops", 0, "label"],
  ["stops", 0, "actionLabel"],
  ["stops", 1, "label"],
  ["stops", 1, "actionLabel"],
  ["labels", "setting"],
  ["labels", "practice"],
  ["labels", "choice"],
  ["labels", "example"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.school-transition-rehearsal.binding",
      message:
        "During a fictional transition visit, a learner practices opening a locker and finding the new classroom, choosing to try the last step while their companion stands back.",
    },
    input: defaultInput,
  },
];
