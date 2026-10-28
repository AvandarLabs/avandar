import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./BatteryDispatchBalance.fixtures";
import authoredMetadata from "./BatteryDispatchBalance.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./BatteryDispatchBalance.controls";
/** Public retrieval metadata contains no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored-copy paths used by Lingui content resolution. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["windows", "chargeLabel"],
  ["windows", "dispatchLabel"],
  ["windows", "sourceLabel"],
  ["windows", "loadLabel"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "capacity"],
  ["copy", "stored"],
  ["copy", "input"],
  ["copy", "delivered"],
  ["copy", "chargeLoss"],
  ["copy", "dischargeLoss"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete fictional binding, without inference or partial merging. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.battery-dispatch-balance.bindingExamples.0.sourceText",
      message:
        "A fictional operator charges a battery with 10 kWh at midday and later delivers 8 kWh, with 1 kWh lost on charging and 1 kWh on discharge.",
    },
    input: DEFAULT_INPUT,
  },
];
