import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ExpectationOverlayCheck.fixtures";
import authoredMetadata from "./ExpectationOverlayCheck.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ExpectationOverlayCheck.controls";
/** Public descriptors with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored default prose path, including nested review copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["tests", 0, "label"],
  ["tests", 0, "inputLabel"],
  ["tests", 0, "expected"],
  ["tests", 0, "observed"],
  ["tests", 1, "label"],
  ["tests", 1, "inputLabel"],
  ["tests", 1, "expected"],
  ["tests", 1, "observed"],
  ["labels", "expected"],
  ["labels", "observed"],
  ["labels", "match"],
  ["labels", "mismatch"],
  ["labels", "untested"],
  ["exampleLabel"],
];
/** Complete authored example, preserved verbatim. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.expectation-overlay-check.binding",
      message:
        "A fictional ticket checker is expected to admit Ticket A and hold expired Ticket B. The observed checker admits both, exposing one mismatch.",
    },
    input: DEFAULT_INPUT,
  },
];
