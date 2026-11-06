import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./WideTableToObservations.fixtures";
import authoredMetadata from "./WideTableToObservations.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./WideTableToObservations.controls";
/** Public retrieval metadata excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["measures", 0, "label"],
  ["measures", 0, "unit"],
  ["measures", 1, "label"],
  ["measures", 1, "unit"],
  ["subjects", 0, "label"],
  ["subjects", 1, "label"],
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
      id: "motionAtlas.wide-table-to-observations.bindingExamples.0.sourceText",
      message:
        "Site A received 12 crates and used 8; Site B received 5 and has no used value. Produce one row per site and measure, retaining the missing cell.",
    },
    input: DEFAULT_INPUT,
  },
];
