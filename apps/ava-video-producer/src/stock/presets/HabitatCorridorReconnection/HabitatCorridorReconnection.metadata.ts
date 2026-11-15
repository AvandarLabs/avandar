import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./HabitatCorridorReconnection.fixtures";
import authoredMetadata from "./HabitatCorridorReconnection.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./HabitatCorridorReconnection.controls";
/** Public retrieval metadata contains no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored-copy paths used by Lingui content resolution. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["patches", 0, "label"],
  ["patches", 1, "label"],
  ["corridor", "label"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "map"],
  ["copy", "barrier"],
  ["copy", "crossing"],
  ["copy", "habitat"],
  ["copy", "otherLand"],
  ["copy", "proposal"],
  ["copy", "implemented"],
  ["copy", "traversal"],
  ["copy", "areaUnit"],
  ["copy", "lengthUnit"],
  ["copy", "disclaimer"],
];
/** Complete fictional binding, without inference or partial merging. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.habitat-corridor-reconnection.bindingExamples.0.sourceText",
      message:
        "A fictional team proposes a 200-metre by 20-metre habitat connection between 3- and 4-hectare patches, reallocating 0.4 hectares within a fixed 20-hectare boundary.",
    },
    input: DEFAULT_INPUT,
  },
];
