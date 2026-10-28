import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ContactWindowOverlap.fixtures";
import authoredMetadata from "./ContactWindowOverlap.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./ContactWindowOverlap.controls";
/** Public retrieval descriptors without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Exact indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["records", 0, "label"],
  ["records", 1, "label"],
  ["records", 2, "label"],
  ["records", 3, "label"],
  ["investigationWindow", "label"],
  ["axis", "unitLabel"],
  ["axis", "venueLabel"],
  ["sceneLabel"],
  ["copy", "overlap"],
  ["copy", "none"],
  ["copy", "unknown"],
  ["copy", "denominator"],
  ["copy", "qualifier"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.contact-window-overlap.bindingExamples.0.sourceText",
      message:
        "At a fictional market, two of four people's recorded visit intervals intersect a supplied review window, one does not, and one person's time is unknown.",
    },
    input: DEFAULT_INPUT,
  },
];
