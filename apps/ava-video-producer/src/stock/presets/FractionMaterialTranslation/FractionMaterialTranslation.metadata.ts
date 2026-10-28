import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./FractionMaterialTranslation.fixtures";
import authoredMetadata from "./FractionMaterialTranslation.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./FractionMaterialTranslation.controls";
/** Public retrieval copy without private source provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for all visible fictional default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["representations", 0, "learnerLabel"],
  ["representations", 0, "materialLabel"],
  ["representations", 1, "learnerLabel"],
  ["representations", 1, "materialLabel"],
  ["representations", 2, "learnerLabel"],
  ["representations", 2, "materialLabel"],
  ["lessonLabel"],
  ["caption"],
];
/** Complete authored input bound to its fictional source example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.fraction-material-translation.bindingExample",
      message:
        "In a fictional lesson, three learners each show one half: one folds paper, one selects a counter from a pair, and one shades a cell out of two.",
    },
    input: DEFAULT_INPUT,
  },
];
