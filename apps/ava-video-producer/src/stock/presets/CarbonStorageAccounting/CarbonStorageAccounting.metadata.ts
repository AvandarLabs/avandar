import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./CarbonStorageAccounting.fixtures";
import authoredMetadata from "./CarbonStorageAccounting.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./CarbonStorageAccounting.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["operatingEmissions", 0, "label"],
  ["boundary", "label"],
  ["boundary", "periodLabel"],
  ["boundary", "includedActivities"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "air"],
  ["copy", "capture"],
  ["copy", "retained"],
  ["copy", "released"],
  ["copy", "operations"],
  ["copy", "net"],
  ["copy", "massUnit"],
  ["copy", "accountingUnit"],
  ["copy", "disclaimer"],
];
/** Complete source binding with all authored input fields. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.carbon-storage-accounting.bindingExamples.0.sourceText",
      message:
        "For this fictional atmospheric-capture batch, 12 tonnes of CO2 were captured, 1 tonne was released, and operating emissions were 2 tonnes CO2e, leaving a 9-tonne CO2e accounting result.",
    },
    input: DEFAULT_INPUT,
  },
];
