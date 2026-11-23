import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ProseMeasurementLedger.fixtures";
import authoredMetadata from "./ProseMeasurementLedger.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./ProseMeasurementLedger.controls";
/** Public retrieval metadata excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["fragments", 0, "text"],
  ["fragments", 1, "text"],
  ["fragments", 2, "text"],
  ["fragments", 3, "text"],
  ["fragments", 4, "text"],
  ["fragments", 5, "text"],
  ["copy", "context"],
  ["copy", "source"],
  ["copy", "result"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.prose-measurement-ledger.bindingExamples.0.sourceText",
      message:
        "West site reported about 12 crates received in week 2. Extract subject, metric, value, unit, period and About qualifier using rules, and keep the row flagged for review.",
    },
    input: DEFAULT_INPUT,
  },
];
