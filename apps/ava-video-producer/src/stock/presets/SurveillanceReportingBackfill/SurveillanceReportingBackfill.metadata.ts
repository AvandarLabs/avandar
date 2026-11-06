import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SurveillanceReportingBackfill.fixtures";
import authoredMetadata from "./SurveillanceReportingBackfill.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths to authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["records", 0, "label"],
  ["records", 1, "label"],
  ["records", 2, "label"],
  ["records", 3, "label"],
  ["records", 4, "label"],
  ["eventBins", 0, "label"],
  ["eventBins", 1, "label"],
  ["eventBins", 2, "label"],
  ["snapshots", 0, "label"],
  ["snapshots", 1, "label"],
  ["copy", "context"],
  ["copy", "axis"],
  ["copy", "unit"],
  ["copy", "earlier"],
  ["copy", "revised"],
  ["copy", "newReports"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.surveillance-reporting-backfill.bindingExample",
      message:
        "Three reports received on fictional Day 5 revise the counts for Days 1 through 3; they are not three events on Day 5.",
    },
    input: DEFAULT_INPUT,
  },
];
