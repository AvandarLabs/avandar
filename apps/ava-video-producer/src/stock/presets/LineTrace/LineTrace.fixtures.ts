import type { StockContract } from "../../contracts/StockContract.types";
import type { LineTraceInput } from "./LineTrace.schema";

/** Complete fictional example used only when input is omitted. */
export const LINE_TRACE_DEFAULT_INPUT: LineTraceInput = {
  points: [18, 24, 21, 39, 35, 51, 47, 61, 58, 76, 73, 88],
  reference: [12, 18, 23, 21, 30, 33, 41, 40, 43, 49, 51, 57],
  heading: "A trend takes shape",
  seriesLabel: "Series A",
  referenceLabel: "Reference",
  showReference: true,
};

/** The maximum supported collection density in the authored layout. */
export const lineTraceDenseInput: LineTraceInput = {
  ...LINE_TRACE_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const lineTraceChangedInput: LineTraceInput = {
  ...LINE_TRACE_DEFAULT_INPUT,
  points: [0, 100],
  reference: [100, 0],
  heading: "An authored trend",
  seriesLabel: "Observed",
  referenceLabel: "Comparator",
  showReference: false,
};

/** Named examples available to editors and semantic regression checks. */
export const lineTraceFixtures: StockContract<
  typeof LINE_TRACE_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: LINE_TRACE_DEFAULT_INPUT },
  { id: "dense", input: lineTraceDenseInput },
  { id: "changed", input: lineTraceChangedInput },
];
