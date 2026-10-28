import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./FictionalConflictGlobe.fixtures";
import authoredMetadata from "./FictionalConflictGlobe.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./FictionalConflictGlobe.controls";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths to authored default display text. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["incidents", 0, "label"],
  ["incidents", 1, "label"],
  ["incidents", 2, "label"],
  ["markerMeaning"],
  ["scenarioCaption"],
];
/** A complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.fictional-conflict-globe.bindingExamples.0.sourceText",
      message:
        "For this fictional exercise, three separate conflict situations appear around a slowly turning world globe.",
    },
    input: DEFAULT_INPUT,
  },
];
