import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./AquiferAllocationBalance.fixtures";
import authoredMetadata from "./AquiferAllocationBalance.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";

export { CONTROLS as controls } from "./AquiferAllocationBalance.controls";
/** Public retrieval metadata contains no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Indexed authored-copy paths used by Lingui content resolution. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["boundary", "label"],
  ["boundary", "periodLabel"],
  ["boundary", "scopeLabel"],
  ["decision", "actorLabel"],
  ["decision", "actionLabel"],
  ["copy", "initial"],
  ["copy", "recharge"],
  ["copy", "naturalOutflow"],
  ["copy", "requested"],
  ["copy", "approved"],
  ["copy", "unallocated"],
  ["copy", "final"],
  ["copy", "unit"],
  ["copy", "disclaimer"],
];
/** Complete fictional binding, without inference or partial merging. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.aquifer-allocation-balance.bindingExamples.0.sourceText",
      message:
        "In a fictional aquifer budget, a planner approves 150 cubic metres of a 200-cubic-metre request; with 120 entering and 30 leaving naturally, storage falls from 1000 to 940 cubic metres.",
    },
    input: DEFAULT_INPUT,
  },
];
