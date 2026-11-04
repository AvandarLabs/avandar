import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ResidentBudgetBallots.fixtures";
import authoredMetadata from "./ResidentBudgetBallots.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public authored retrieval descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed default translation paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["projects", 0, "label"],
  ["projects", 1, "label"],
  ["labels", "choices"],
  ["labels", "box"],
  ["labels", "tally"],
  ["labels", "abstained"],
  ["labels", "unit"],
  ["labels", "example"],
  ["closingNote"],
];
/** Complete fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.resident-budget-ballots.binding",
      message:
        "In a fictional participatory-budget consultation, four residents produce two seating ballots, one reading ballot and one abstention.",
    },
    input: DEFAULT_INPUT,
  },
];
