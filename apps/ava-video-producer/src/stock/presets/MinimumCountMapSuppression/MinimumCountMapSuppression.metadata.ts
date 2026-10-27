import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./MinimumCountMapSuppression.fixtures";
import authoredMetadata from "./MinimumCountMapSuppression.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public discovery copy and explicit teaching limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored prose path in the complete default. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["cells", 0, "label"],
  ["cells", 1, "label"],
  ["cells", 2, "label"],
  ["cells", 3, "label"],
  ["labels", "local"],
  ["labels", "public"],
  ["labels", "suppressed"],
  ["labels", "missing"],
  ["labels", "zero"],
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
      id: "motionAtlas.minimum-count-map-suppression.bindingExample",
      message:
        "Apply release threshold 5 to cell counts 2, 6, 0 and missing. Release 6 and reported zero, mark 2 suppressed and keep missing separate without a recoverable total.",
    },
    input: DEFAULT_INPUT,
  },
];
