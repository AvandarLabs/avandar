import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ChosenServiceAccess.fixtures";
import authoredMetadata from "./ChosenServiceAccess.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./ChosenServiceAccess.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["services", 0, "label"],
  ["services", 1, "label"],
  ["labels", "participant"],
  ["labels", "staff"],
  ["labels", "choice"],
  ["scenarioCaption"],
];
/** Complete source binding with all authored input fields. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.chosen-service-access.bindingExamples.0.sourceText",
      message:
        "A fictional participant chooses the shelter desk and enters independently after staff unfold a ramp over its step.",
    },
    input: DEFAULT_INPUT,
  },
];
