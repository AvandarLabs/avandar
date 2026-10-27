import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./VaccinationSessionBalance.fixtures";
import authoredMetadata from "./VaccinationSessionBalance.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./VaccinationSessionBalance.controls";
/** Public retrieval descriptors without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Exact indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["recipients", 0, "label"],
  ["recipients", 1, "label"],
  ["recipients", 2, "label"],
  ["sceneLabel"],
  ["copy", "opening"],
  ["copy", "administered"],
  ["copy", "remaining"],
  ["copy", "discarded"],
  ["copy", "people"],
  ["copy", "unit"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.vaccination-session-balance.bindingExamples.0.sourceText",
      message:
        "A fictional clinic opens with six dose units and records three used, two remaining, and one lost, serving three distinct people.",
    },
    input: DEFAULT_INPUT,
  },
];
