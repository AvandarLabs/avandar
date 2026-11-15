import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./CoordinateQualityTriage.fixtures";
import authoredMetadata from "./CoordinateQualityTriage.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public discovery copy and explicit teaching limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored prose path in the complete default. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["labels", "plotted"],
  ["labels", "missing"],
  ["labels", "nonNumeric"],
  ["labels", "range"],
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
      id: "motionAtlas.coordinate-quality-triage.bindingExample",
      message:
        "Map numeric pair latitude 20 longitude 40. Keep a missing latitude, latitude 120 and text latitude north in separate diagnostic trays, accounting for all four rows.",
    },
    input: DEFAULT_INPUT,
  },
];
