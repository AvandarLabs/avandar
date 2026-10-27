import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./DistanceBufferEnvelope.fixtures";
import authoredMetadata from "./DistanceBufferEnvelope.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy and explicit limits. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["origin", "label"],
  ["locations", 0, "label"],
  ["locations", 1, "label"],
  ["locations", 2, "label"],
  ["labels", "unit"],
  ["labels", "inside"],
  ["labels", "outside"],
  ["labels", "qualifier"],
  ["copy", "context"],
  ["copy", "source"],
  ["copy", "result"],
];
/** Complete accepted fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.distance-buffer-envelope.bindingExample",
      message:
        "Draw a radius-30 envelope around (50,50). Locations at (60,50) and (70,70) lie within it; (90,50) lies beyond it. This is distance, not travel time.",
    },
    input: DEFAULT_INPUT,
  },
];
