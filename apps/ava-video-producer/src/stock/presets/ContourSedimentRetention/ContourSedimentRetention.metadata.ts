import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ContourSedimentRetention.fixtures";
import authoredMetadata from "./ContourSedimentRetention.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ContourSedimentRetention.controls";
/** Public retrieval descriptors contain no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["intervention", "label"],
  ["boundary", "slopeLabel"],
  ["boundary", "periodLabel"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "mobilized"],
  ["copy", "retained"],
  ["copy", "exported"],
  ["copy", "boundary"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete binding, never a partial patch. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.contour-sediment-retention.bindingExample",
      message:
        "For one fictional runoff event, an installed contour strip retains 5 kilograms of an 8-kilogram mobilized sediment load, while 3 kilograms leaves the boundary.",
    },
    input: DEFAULT_INPUT,
  },
];
