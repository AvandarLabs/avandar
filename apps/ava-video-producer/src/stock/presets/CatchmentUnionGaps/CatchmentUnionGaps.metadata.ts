import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./CatchmentUnionGaps.fixtures";
import authoredMetadata from "./CatchmentUnionGaps.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every authored default label. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["catchments", 0, "label"],
  ["catchments", 1, "label"],
  ["households", 0, "label"],
  ["households", 1, "label"],
  ["households", 2, "label"],
  ["households", 3, "label"],
  ["copy", "context"],
  ["copy", "covered"],
  ["copy", "uncovered"],
  ["copy", "overlap"],
  ["copy", "total"],
  ["copy", "households"],
  ["copy", "members"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.catchment-union-gaps.bindingExample",
      message:
        "The fictional services cover three of four supplied households, including one household inside both footprints.",
    },
    input: defaultInput,
  },
];
