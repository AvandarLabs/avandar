import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./StratifiedSpatialSample.fixtures";
import authoredMetadata from "./StratifiedSpatialSample.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every authored default label. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["strata", 0, "label"],
  ["strata", 1, "label"],
  ["sites", 0, "label"],
  ["sites", 1, "label"],
  ["sites", 2, "label"],
  ["sites", 3, "label"],
  ["sites", 4, "label"],
  ["copy", "context"],
  ["copy", "selected"],
  ["copy", "eligible"],
  ["copy", "unsampled"],
  ["copy", "unit"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.stratified-spatial-sample.bindingExample",
      message:
        "The fictional field plan selects one of three eligible western sites and one of two eastern sites.",
    },
    input: defaultInput,
  },
];
