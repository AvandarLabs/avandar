import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./EqualCountUnequalVolume.fixtures";
import authoredMetadata from "./EqualCountUnequalVolume.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./EqualCountUnequalVolume.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for visible default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["groups", 0, "label"],
  ["groups", 0, "items", 0, "label"],
  ["groups", 0, "items", 1, "label"],
  ["groups", 0, "items", 2, "label"],
  ["groups", 1, "label"],
  ["groups", 1, "items", 0, "label"],
  ["groups", 1, "items", 1, "label"],
  ["groups", 1, "items", 2, "label"],
  ["measure", "basisLabel"],
  ["copy", "count"],
  ["copy", "size"],
  ["copy", "total"],
  ["copy", "proxyNote"],
  ["copy", "example"],
];
/** Complete fictional authored binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.equal-count-unequal-volume.bindingExamples.0.sourceText",
      message:
        "Two fictional collections each contain three datasets. The first stores 100, 200, and 300 illustrative bytes; the second stores 500, 800, and 900. Their equal dataset counts coexist with totals of 600 and 2200 bytes on the same size scale.",
    },
    input: DEFAULT_INPUT,
  },
];
