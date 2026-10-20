import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./BoundedLocationDisplacement.fixtures";
import authoredMetadata from "./BoundedLocationDisplacement.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy and explicit limits. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["locations", 0, "label"],
  ["locations", 1, "label"],
  ["labels", "source"],
  ["labels", "display"],
  ["labels", "approximate"],
  ["labels", "bound"],
  ["copy", "context"],
  ["copy", "before"],
  ["copy", "after"],
];
/** Complete accepted fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.bounded-location-displacement.bindingExample",
      message:
        "Displace Location A by (6,4) and Location B by (-5,3), both within a ten-unit bound. Retain original positions locally and label display copies approximate.",
    },
    input: DEFAULT_INPUT,
  },
];
