import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./LateTypeEvidence.fixtures";
import authoredMetadata from "./LateTypeEvidence.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy and explicit limits. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["labels", "column"],
  ["labels", "provisional"],
  ["labels", "text"],
  ["labels", "review"],
  ["labels", "rows"],
  ["copy", "context"],
  ["copy", "source"],
  ["copy", "result"],
];
/** Complete accepted fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.late-type-evidence.bindingExample",
      message:
        "A column begins 12, 8 and 4, then contains Pending. Widen the proposed numeric type to text while preserving all four original strings.",
    },
    input: DEFAULT_INPUT,
  },
];
