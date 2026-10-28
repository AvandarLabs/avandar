import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./CellNormalization.fixtures";
import authoredMetadata from "./CellNormalization.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./CellNormalization.controls";
/** Public retrieval descriptors preserve accepted intent and limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every default display-copy segment. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["title"],
  ["rows", 0, "before"],
  ["rows", 0, "after"],
  ["rows", 0, "editLabel"],
  ["rows", 1, "before"],
  ["rows", 1, "after"],
  ["rows", 1, "editLabel"],
  ["rows", 2, "before"],
  ["rows", 2, "after"],
  ["rows", 2, "editLabel"],
  ["columnLabels", "original"],
  ["columnLabels", "result"],
  ["columnLabels", "change"],
];
/** Complete fictional source binding independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.cell-normalization.bindingExamples.0.sourceText",
      message:
        "In the fictional location list, trim the leading spaces in Bay A and standardize the capitalization of Bay B.",
    },
    input: DEFAULT_INPUT,
  },
];
