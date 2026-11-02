import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./NestedDrilldownWindow.fixtures";
import authoredMetadata from "./NestedDrilldownWindow.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./NestedDrilldownWindow.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for supplied display copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["records", 0, "label"],
  ["records", 0, "groups", 0],
  ["records", 0, "groups", 1],
  ["records", 1, "label"],
  ["records", 1, "groups", 0],
  ["records", 1, "groups", 1],
  ["records", 2, "label"],
  ["records", 2, "groups", 0],
  ["records", 2, "groups", 1],
  ["records", 3, "label"],
  ["records", 3, "groups", 0],
  ["records", 3, "groups", 1],
  ["dimensions", 0],
  ["dimensions", 1],
  ["selectionPath", 0],
  ["selectionPath", 1],
  ["labels", "title"],
  ["labels", "root"],
  ["labels", "detail"],
  ["labels", "context"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.nested-drilldown-window.bindingExamples.0.sourceText",
      message:
        "From the fictional supply list, drill into North and then Stored to inspect Paper and Folders.",
    },
    input: DEFAULT_INPUT,
  },
];
