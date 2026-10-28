import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./StormwaterStorageSpill.fixtures";
import authoredMetadata from "./StormwaterStorageSpill.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./StormwaterStorageSpill.controls";
/** Public retrieval descriptors contain no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit visible default copy paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["boundary", "locationLabel"],
  ["boundary", "periodLabel"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "inflow"],
  ["copy", "infiltration"],
  ["copy", "discharge"],
  ["copy", "detained"],
  ["copy", "overflow"],
  ["copy", "capacity"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete binding, never a partial patch. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.stormwater-storage-spill.bindingExample",
      message:
        "In a fictional storm event, 120 cubic metres reaches a block: 20 infiltrates, 50 is discharged, 40 is held, and 10 overflows.",
    },
    input: DEFAULT_INPUT,
  },
];
