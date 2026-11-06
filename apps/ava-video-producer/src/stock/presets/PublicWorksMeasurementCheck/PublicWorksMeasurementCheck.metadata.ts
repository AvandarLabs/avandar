import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { defaultInput } from "./PublicWorksMeasurementCheck.fixtures";
import authoredMetadata from "./PublicWorksMeasurementCheck.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval and display descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for default visible copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["specification", "label"],
  ["specification", "unit"],
  ["observation", "label"],
  ["observation", "sourceLabel"],
  ["observers", 0, "label"],
  ["observers", 1, "label"],
  ["labels", "specification"],
  ["labels", "observation"],
  ["labels", "difference"],
  ["labels", "example"],
];
/** Complete fictional source binding. */
export const bindingExamples: StockContract<
  typeof defaultInput
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.public-works-measurement-check.binding",
      message:
        "In a fictional social audit, residents compare a four-demo-metre published wall specification with a supplied three-demo-metre measurement.",
    },
    input: defaultInput,
  },
];
