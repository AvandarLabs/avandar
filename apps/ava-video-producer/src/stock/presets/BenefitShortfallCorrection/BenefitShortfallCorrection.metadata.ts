import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./BenefitShortfallCorrection.fixtures";
import authoredMetadata from "./BenefitShortfallCorrection.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public authored retrieval descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed default translation paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", "participant"],
  ["people", "worker"],
  ["payments", 0, "label"],
  ["unitLabel"],
  ["labels", "stated"],
  ["labels", "received"],
  ["labels", "correction"],
  ["labels", "unresolved"],
  ["exampleLabel"],
];
/** Complete fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.benefit-shortfall-correction.binding",
      message:
        "A fictional recipient expected five demo credits, received three, and verifies a later one-credit correction while one credit remains missing.",
    },
    input: DEFAULT_INPUT,
  },
];
