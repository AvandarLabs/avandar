import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SpatialGridBinning.fixtures";
import authoredMetadata from "./SpatialGridBinning.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public discovery copy and explicit teaching limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored prose path in the complete default. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["labels", "unit"],
  ["labels", "zero"],
  ["labels", "total"],
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
      id: "motionAtlas.spatial-grid-binning.bindingExample",
      message:
        "Overlay a 2-by-2 grid on four points. Their cells contain 2, 1, 0 and 1 records, totaling the original four observations.",
    },
    input: DEFAULT_INPUT,
  },
];
