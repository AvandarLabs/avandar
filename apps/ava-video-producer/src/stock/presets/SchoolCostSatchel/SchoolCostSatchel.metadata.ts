import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SchoolCostSatchel.fixtures";
import authoredMetadata from "./SchoolCostSatchel.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./SchoolCostSatchel.controls";
/** Public retrieval copy without private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for all visible fictional default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["expenses", 0, "label"],
  ["expenses", 1, "label"],
  ["expenses", 2, "label"],
  ["periodLabel"],
  ["unitLabel"],
  ["sceneLabels", "learner"],
  ["sceneLabels", "school"],
  ["sceneLabels", "total"],
  ["caption"],
];
/** Complete authored input bound to its fictional source example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.school-cost-satchel.bindingExample",
      message:
        "A fictional household plans three example credits for a workbook, two for transport, and one for school clothing over the same term.",
    },
    input: DEFAULT_INPUT,
  },
];
