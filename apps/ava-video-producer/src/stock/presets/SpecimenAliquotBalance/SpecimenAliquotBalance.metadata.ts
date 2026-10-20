import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SpecimenAliquotBalance.fixtures";
import authoredMetadata from "./SpecimenAliquotBalance.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./SpecimenAliquotBalance.controls";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["parent", "label"],
  ["aliquots", 0, "label"],
  ["aliquots", 1, "label"],
  ["unitLabel"],
  ["sceneLabel"],
  ["copy", "source"],
  ["copy", "tubes"],
  ["copy", "remainder"],
  ["copy", "transferred"],
  ["copy", "parentVolume"],
  ["parent", "id"],
  ["aliquots", 0, "id"],
  ["aliquots", 1, "id"],
];
/** A complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.specimen-aliquot-balance.bindingExamples.0.sourceText",
      message:
        "One fictional specimen containing six schematic volume units is split into two aliquots of two and three units, leaving one unit in the parent tube.",
    },
    input: DEFAULT_INPUT,
  },
];
