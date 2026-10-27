import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./DoseCohortReturnPaths.fixtures";
import authoredMetadata from "./DoseCohortReturnPaths.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./DoseCohortReturnPaths.controls";
/** Public retrieval descriptors without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Exact indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["visits", 0, "label"],
  ["visits", 1, "label"],
  ["visits", 2, "label"],
  ["participants", 0, "label"],
  ["participants", 1, "label"],
  ["participants", 2, "label"],
  ["participants", 3, "label"],
  ["participants", 4, "label"],
  ["participants", 5, "label"],
  ["sceneLabel"],
  ["copy", "baseline"],
  ["copy", "recorded"],
  ["copy", "missed"],
  ["copy", "notDue"],
  ["copy", "unknown"],
  ["copy", "retained"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.dose-cohort-return-paths.bindingExamples.0.sourceText",
      message:
        "Six fictional people began a multi-visit programme; a later return must still be counted against the original six, with missed and unknown records shown separately.",
    },
    input: DEFAULT_INPUT,
  },
];
