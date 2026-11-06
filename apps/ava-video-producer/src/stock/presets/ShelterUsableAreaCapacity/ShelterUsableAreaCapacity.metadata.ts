import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ShelterUsableAreaCapacity.fixtures";
import authoredMetadata from "./ShelterUsableAreaCapacity.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval metadata without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths to authored default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["copy", "context"],
  ["copy", "sleeping"],
  ["copy", "circulation"],
  ["copy", "storage"],
  ["copy", "closed"],
  ["copy", "gross"],
  ["copy", "usable"],
  ["copy", "benchmark"],
  ["copy", "capacity"],
  ["copy", "demand"],
  ["copy", "shortfall"],
  ["copy", "spare"],
  ["copy", "areaUnit"],
];
/** Complete fictional binding example. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.shelter-usable-area-capacity.bindingExample",
      message:
        "The fictional shelter has 24 square metres gross but 12 usable; its authored two-square-metre divisor gives six place equivalents against eight registered people.",
    },
    input: DEFAULT_INPUT,
  },
];
