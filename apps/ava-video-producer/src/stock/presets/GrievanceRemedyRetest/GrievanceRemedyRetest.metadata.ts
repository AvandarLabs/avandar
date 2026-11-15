import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./GrievanceRemedyRetest.fixtures";
import authoredMetadata from "./GrievanceRemedyRetest.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public authored retrieval descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed default translation paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "participant"],
  ["people", "worker"],
  ["object", "label"],
  ["labels", "issue"],
  ["labels", "repair"],
  ["labels", "test"],
  ["labels", "accepted"],
  ["labels", "notAccepted"],
  ["labels", "pending"],
  ["labels", "example"],
];
/** Complete fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.grievance-remedy-retest.binding",
      message:
        "In a fictional shelter, a resident reports a locker latch, tries the replacement themselves, and confirms whether the remedy addresses the complaint.",
    },
    input: DEFAULT_INPUT,
  },
];
