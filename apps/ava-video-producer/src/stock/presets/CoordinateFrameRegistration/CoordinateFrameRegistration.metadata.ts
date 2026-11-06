import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./CoordinateFrameRegistration.fixtures";
import authoredMetadata from "./CoordinateFrameRegistration.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public discovery copy and explicit teaching limitations. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored prose path in the complete default. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["landmarks", 0, "label"],
  ["landmarks", 1, "label"],
  ["landmarks", 2, "label"],
  ["frames", "source"],
  ["frames", "target"],
  ["frames", "sourceUnit"],
  ["frames", "targetUnit"],
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
      id: "motionAtlas.coordinate-frame-registration.bindingExample",
      message:
        "Convert local grid A into grid B using x+20 and 0.75*y+5. Landmark A at (10,20) becomes (30,20), while every landmark keeps its identity.",
    },
    input: DEFAULT_INPUT,
  },
];
