import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SchoolLunchTrayComposition.fixtures";
import authoredMetadata from "./SchoolLunchTrayComposition.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./SchoolLunchTrayComposition.controls";
/** Public retrieval copy and bounded interpretation. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["learners", 0, "label"],
  ["learners", 1, "label"],
  ["learners", 2, "label"],
  ["learners", 3, "label"],
  ["plannedComponents", 0, "label"],
  ["plannedComponents", 1, "label"],
  ["plannedComponents", 2, "label"],
  ["labels", "plan"],
  ["labels", "matchesPlan"],
  ["labels", "plannedTrays"],
  ["labels", "missing"],
  ["caption"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.school-lunch-tray-composition.bindingExample",
      message:
        "In a fictional school lunch for four learners, three of four planned trays contain grain, beans, and fruit; the fourth contains grain and beans.",
    },
    input: DEFAULT_INPUT,
  },
];
