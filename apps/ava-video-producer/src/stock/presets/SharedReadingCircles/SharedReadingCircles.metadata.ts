import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SharedReadingCircles.fixtures";
import authoredMetadata from "./SharedReadingCircles.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./SharedReadingCircles.controls";
/** Public retrieval copy without private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for all visible fictional default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["learners", 0, "label"],
  ["learners", 1, "label"],
  ["learners", 2, "label"],
  ["learners", 3, "label"],
  ["learners", 4, "label"],
  ["learners", 5, "label"],
  ["books", 0, "label"],
  ["books", 0, "pageLabel"],
  ["books", 1, "label"],
  ["books", 1, "pageLabel"],
  ["labels", "books"],
  ["labels", "readers"],
  ["labels", "class"],
  ["caption"],
];
/** Complete authored input bound to its fictional source example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.shared-reading-circles.bindingExample",
      message:
        "In a fictional class of six learners, two existing story books are shared at two tables with three readers around each book.",
    },
    input: DEFAULT_INPUT,
  },
];
