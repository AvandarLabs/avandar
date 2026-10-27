import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./MissedVisitReconnect.fixtures";
import authoredMetadata from "./MissedVisitReconnect.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./MissedVisitReconnect.controls";
/** Public retrieval descriptors without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Exact indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["cases", 0, "label"],
  ["cases", 1, "label"],
  ["cases", 2, "label"],
  ["cases", 3, "label"],
  ["places", "homeLabel"],
  ["places", "clinicLabel"],
  ["places", "calendarLabel"],
  ["sceneLabel"],
  ["copy", "group"],
  ["copy", "attempts"],
  ["copy", "unreached"],
  ["copy", "contacted"],
  ["copy", "booked"],
  ["copy", "attended"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.missed-visit-reconnect.bindingExamples.0.sourceText",
      message:
        "Among four fictional people with missed visits, six contact attempts lead to one recorded return, one booking, one conversation, and one person not reached.",
    },
    input: DEFAULT_INPUT,
  },
];
