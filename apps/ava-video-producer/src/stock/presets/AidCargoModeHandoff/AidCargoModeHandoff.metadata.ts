import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./AidCargoModeHandoff.fixtures";
import authoredMetadata from "./AidCargoModeHandoff.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./AidCargoModeHandoff.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["carriers", 0, "handoffLabel"],
  ["carriers", 1, "handoffLabel"],
  ["carriers", 2, "handoffLabel"],
  ["parcels", 0, "label"],
  ["parcels", 1, "label"],
  ["receivingLabel"],
  ["scenarioCaption"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.aid-cargo-mode-handoff.bindingExamples.0.sourceText",
      message:
        "A fictional food parcel and blanket pack move from a river boat to a truck and finally to a cargo bike without losing their identities.",
    },
    input: DEFAULT_INPUT,
  },
];
