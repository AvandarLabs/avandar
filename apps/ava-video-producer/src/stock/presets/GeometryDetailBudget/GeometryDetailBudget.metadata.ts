import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./GeometryDetailBudget.fixtures";
import authoredMetadata from "./GeometryDetailBudget.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public discovery copy and explicit teaching limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored prose path in the complete default. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["labels", "original"],
  ["labels", "simplified"],
  ["labels", "kept"],
  ["labels", "removed"],
  ["labels", "unit"],
  ["copy", "context"],
  ["copy", "before"],
  ["copy", "after"],
];
/** Complete accepted fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.geometry-detail-budget.bindingExample",
      message:
        "Simplify the six supplied line vertices with a six-unit Douglas-Peucker tolerance. Preserve endpoints and show how removed vertices relate to the retained segments.",
    },
    input: DEFAULT_INPUT,
  },
];
