import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./OutreachHouseholdRevisits.fixtures";
import authoredMetadata from "./OutreachHouseholdRevisits.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./OutreachHouseholdRevisits.controls";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["households", 0, "label"],
  ["households", 1, "label"],
  ["households", 2, "label"],
  ["households", 3, "label"],
  ["households", 4, "label"],
  ["households", 5, "label"],
  ["sceneLabel"],
  ["copy", "map"],
  ["copy", "visits"],
  ["copy", "visited"],
  ["copy", "contacted"],
  ["copy", "noContact"],
  ["copy", "unvisited"],
  ["copy", "denominator"],
];
/** A complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.outreach-household-revisits.bindingExamples.0.sourceText",
      message:
        "Five fictional outreach visits reach four distinct homes and make contact with three households in a neighborhood containing six households.",
    },
    input: DEFAULT_INPUT,
  },
];
