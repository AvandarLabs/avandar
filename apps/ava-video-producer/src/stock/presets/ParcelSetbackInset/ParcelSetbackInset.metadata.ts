import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./ParcelSetbackInset.fixtures";
import authoredMetadata from "./ParcelSetbackInset.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed paths for every authored default label. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["parcels", 0, "label"],
  ["parcels", 1, "label"],
  ["structure", "label"],
  ["copy", "context"],
  ["copy", "parcel"],
  ["copy", "envelope"],
  ["copy", "clearance"],
  ["copy", "empty"],
  ["copy", "unit"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.parcel-setback-inset.bindingExample",
      message:
        "Fictional planners leave four schematic units around each plot before placing the service kiosk in Plot B.",
    },
    input: defaultInput,
  },
];
