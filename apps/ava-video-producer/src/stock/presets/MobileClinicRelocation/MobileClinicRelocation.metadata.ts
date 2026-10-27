import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./MobileClinicRelocation.fixtures";
import authoredMetadata from "./MobileClinicRelocation.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./MobileClinicRelocation.controls";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["sites", 0, "label"],
  ["sites", 1, "label"],
  ["slots", 0, "label"],
  ["slots", 1, "label"],
  ["slots", 2, "label"],
  ["slots", 3, "label"],
  ["people", 0, "label"],
  ["people", 1, "label"],
  ["people", 2, "label"],
  ["people", 3, "label"],
  ["people", 4, "label"],
  ["sceneLabel"],
  ["copy", "map"],
  ["copy", "people"],
  ["copy", "booked"],
  ["copy", "unbooked"],
  ["copy", "slots"],
  ["copy", "open"],
  ["copy", "clinic"],
];
/** A complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.mobile-clinic-relocation.bindingExamples.0.sourceText",
      message:
        "A fictional mobile clinic moves to a community site with four appointment slots; three of five depicted people are booked and one slot remains open.",
    },
    input: DEFAULT_INPUT,
  },
];
