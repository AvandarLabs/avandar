import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./HouseholdMarketChoice.fixtures";
import authoredMetadata from "./HouseholdMarketChoice.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./HouseholdMarketChoice.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["products", 0, "label"],
  ["products", 1, "label"],
  ["products", 2, "label"],
  ["labels", "shopper"],
  ["labels", "retailer"],
  ["labels", "unit"],
  ["labels", "total"],
  ["labels", "remaining"],
  ["labels", "tender"],
  ["scenarioCaption"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.household-market-choice.bindingExamples.0.sourceText",
      message:
        "A fictional household uses an eight-credit voucher to choose grain and beans, leaving vegetables on the shelf and three demo credits for later.",
    },
    input: DEFAULT_INPUT,
  },
];
