import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PersonLedSupportCalendar.fixtures";
import authoredMetadata from "./PersonLedSupportCalendar.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths to authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "participant"],
  ["people", "worker"],
  ["days", 0, "label"],
  ["days", 1, "label"],
  ["timeBands", 0, "label"],
  ["timeBands", 1, "label"],
  ["commitments", 0, "label"],
  ["commitments", 1, "label"],
  ["copy", "goal"],
  ["copy", "agreement"],
  ["copy", "example"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.person-led-support-calendar.bindingExample",
      message:
        "In this fictional case meeting, the participant moves a planning visit to Wednesday morning so Tuesday caregiving remains possible.",
    },
    input: DEFAULT_INPUT,
  },
];
