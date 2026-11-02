import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./RetailShelfReplenishment.fixtures";
import authoredMetadata from "./RetailShelfReplenishment.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./RetailShelfReplenishment.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["goods", 0, "label"],
  ["goods", 1, "label"],
  ["labels", "retailer"],
  ["labels", "shopper"],
  ["labels", "order"],
  ["labels", "delivery"],
  ["labels", "unit"],
  ["scenarioCaption"],
];
/** Complete source binding with all authored input fields. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.retail-shelf-replenishment.bindingExamples.0.sourceText",
      message:
        "A fictional retailer replenishes grain and beans before a shopper chooses one item from each shelf.",
    },
    input: DEFAULT_INPUT,
  },
];
