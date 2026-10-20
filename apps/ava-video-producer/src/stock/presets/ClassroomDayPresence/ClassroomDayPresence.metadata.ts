import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ClassroomDayPresence.fixtures";
import authoredMetadata from "./ClassroomDayPresence.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./ClassroomDayPresence.controls";
/** Public retrieval metadata contains no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored-copy paths used by Lingui content resolution. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["learners", 0, "label"],
  ["learners", 1, "label"],
  ["learners", 2, "label"],
  ["learners", 3, "label"],
  ["learners", 4, "label"],
  ["learners", 5, "label"],
  ["days", 0, "label"],
  ["days", 1, "label"],
  ["days", 2, "label"],
  ["labels", "present"],
  ["labels", "absent"],
  ["labels", "unknown"],
  ["labels", "roster"],
  ["caption"],
];
/** Complete fictional binding, without inference or partial merging. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.classroom-day-presence.bindingExamples.0.sourceText",
      message:
        "In a fictional class of six learners, four are present on Day A, five on Day B, and four on Day C; one Day C record is unknown.",
    },
    input: DEFAULT_INPUT,
  },
];
