import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./DocumentRegionDriftCheck.fixtures";
import authoredMetadata from "./DocumentRegionDriftCheck.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { controls } from "./DocumentRegionDriftCheck.controls";
/** Public retrieval metadata excludes private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["saved", "header"],
  ["saved", "fingerprint"],
  ["current", "header"],
  ["current", "fingerprint"],
  ["labels", "saved"],
  ["labels", "current"],
  ["labels", "matched"],
  ["labels", "review"],
  ["labels", "geometry"],
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
      id: "motionAtlas.document-region-drift-check.bindingExamples.0.sourceText",
      message:
        "Reopen page 2 at the saved region for Site | Items. The new detector calls it table 4, but its fingerprint changed from FP-A to FP-B, so hold replacement for review.",
    },
    input: DEFAULT_INPUT,
  },
];
