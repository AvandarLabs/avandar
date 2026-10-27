import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./SharedWorkshopBooking.fixtures";
import authoredMetadata from "./SharedWorkshopBooking.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval and display descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for default visible copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["machine", "label"],
  ["timeSlots", 0, "label"],
  ["timeSlots", 1, "label"],
  ["timeSlots", 2, "label"],
  ["requests", 0, "participant"],
  ["requests", 1, "participant"],
  ["labels", "requested"],
  ["labels", "agreed"],
  ["labels", "unresolved"],
  ["labels", "example"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.shared-workshop-booking.binding",
      message:
        "Two fictional makers both request demo slot A for one sewing machine, then agree that maker A uses A and maker B uses B.",
    },
    input: defaultInput,
  },
];
