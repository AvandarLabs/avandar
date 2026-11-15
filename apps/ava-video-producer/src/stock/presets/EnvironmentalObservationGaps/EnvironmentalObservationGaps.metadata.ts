import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./EnvironmentalObservationGaps.fixtures";
import authoredMetadata from "./EnvironmentalObservationGaps.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./EnvironmentalObservationGaps.controls";
/** Public retrieval metadata contains no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored-copy paths used by Lingui content resolution. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["cells", 0, "label"],
  ["cells", 1, "label"],
  ["cells", 2, "label"],
  ["cells", 3, "label"],
  ["cells", 4, "label"],
  ["cells", 5, "label"],
  ["metric", "label"],
  ["metric", "unit"],
  ["metric", "periodLabel"],
  ["fieldChecks", 0, "label"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "map"],
  ["copy", "observed"],
  ["copy", "missing"],
  ["copy", "fieldCheck"],
  ["copy", "pointSupport"],
  ["copy", "areaUnit"],
  ["copy", "disclaimer"],
];
/** Complete fictional binding, without inference or partial merging. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.environmental-observation-gaps.bindingExamples.0.sourceText",
      message:
        "A fictional environmental tile has readings for 4 of 6 hectares; a point field check inside a cloudy cell adds evidence but leaves the area-wide observation missing.",
    },
    input: DEFAULT_INPUT,
  },
];
