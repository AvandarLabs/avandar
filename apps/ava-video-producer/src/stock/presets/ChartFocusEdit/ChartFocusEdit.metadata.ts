import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ChartFocusEdit.fixtures";
import authoredMetadata from "./ChartFocusEdit.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ChartFocusEdit.controls";
/** Public retrieval descriptors preserve accepted intent and limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every default display-copy segment. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["categories", 0, "label"],
  ["categories", 1, "label"],
  ["categories", 2, "label"],
  ["unitLabel"],
  ["headings", "title"],
  ["headings", "before"],
  ["headings", "after"],
];
/** Complete fictional source binding independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.chart-focus-edit.bindingExamples.0.sourceText",
      message:
        "Refine the fictional supply chart with direct labels and emphasize Ink without changing any counts.",
    },
    input: DEFAULT_INPUT,
  },
];
