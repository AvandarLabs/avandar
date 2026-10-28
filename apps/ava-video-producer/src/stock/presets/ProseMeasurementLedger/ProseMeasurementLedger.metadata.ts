import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ProseMeasurementLedger.fixtures";
import authoredMetadata from "./ProseMeasurementLedger.metadata.yaml";
import type {
  StockContract,
  StockDefaultSpanBinding,
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

/**
 * Marked translation units preserve each semantic selection's exact default
 * span.
 */
export const DEFAULT_SPAN_BINDINGS: StockDefaultSpanBinding[] = [
  {
    textPath: ["fragments", 0, "text"],
    startPath: ["fragments", 0, "contentStart"],
    endPath: ["fragments", 0, "contentEnd"],
    template: "<content>West site</content> reported ",
  },
  {
    textPath: ["fragments", 1, "text"],
    startPath: ["fragments", 1, "contentStart"],
    endPath: ["fragments", 1, "contentEnd"],
    template: "<content>about</content> ",
  },
  {
    textPath: ["fragments", 2, "text"],
    startPath: ["fragments", 2, "contentStart"],
    endPath: ["fragments", 2, "contentEnd"],
    template: "<content>12</content> ",
  },
  {
    textPath: ["fragments", 3, "text"],
    startPath: ["fragments", 3, "contentStart"],
    endPath: ["fragments", 3, "contentEnd"],
    template: "<content>crates</content> ",
  },
  {
    textPath: ["fragments", 4, "text"],
    startPath: ["fragments", 4, "contentStart"],
    endPath: ["fragments", 4, "contentEnd"],
    template: "<content>received</content> ",
  },
  {
    textPath: ["fragments", 5, "text"],
    startPath: ["fragments", 5, "contentStart"],
    endPath: ["fragments", 5, "contentEnd"],
    template: "in <content>week 2</content>.",
  },
];
