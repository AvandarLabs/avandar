import type { StockContract } from "../../contracts/StockContract.types";
import type { MetricCounterInput } from "./MetricCounter.schema";

/** Complete fictional example used only when input is omitted. */
export const METRIC_COUNTER_DEFAULT_INPUT: MetricCounterInput = {
  value: 12480,
  unit: "",
  label: "Example records processed",
  bars: [0.25, 0.4, 0.32, 0.53, 0.46, 0.6, 0.67, 0.61, 0.76, 0.87, 0.81, 1],
  showBars: true,
};

/** The maximum supported collection density in the authored layout. */
export const metricCounterDenseInput: MetricCounterInput = {
  ...METRIC_COUNTER_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const metricCounterChangedInput: MetricCounterInput = {
  ...METRIC_COUNTER_DEFAULT_INPUT,
  value: 725,
  unit: " kg",
  label: "Authored material total",
  bars: [0.2, 0.5, 1],
  showBars: false,
};

/** Named examples available to editors and semantic regression checks. */
export const metricCounterFixtures: StockContract<
  typeof METRIC_COUNTER_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: METRIC_COUNTER_DEFAULT_INPUT },
  { id: "dense", input: metricCounterDenseInput },
  { id: "changed", input: metricCounterChangedInput },
];
