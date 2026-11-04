import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./QueueRelief.fixtures";
import authoredMetadata from "./QueueRelief.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./QueueRelief.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for supplied display copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["items", 0, "label"],
  ["items", 1, "label"],
  ["items", 2, "label"],
  ["items", 3, "label"],
  ["items", 4, "label"],
  ["serviceSlots", 0, "label"],
  ["serviceSlots", 1, "label"],
  ["queueLabel"],
  ["completionLabel"],
  ["capacityChangeLabel"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.queue-relief.bindingExamples.0.sourceText",
      message:
        "In a fictional help desk, five requests wait for one desk until a second desk opens and helps clear the queue.",
    },
    input: DEFAULT_INPUT,
  },
];
