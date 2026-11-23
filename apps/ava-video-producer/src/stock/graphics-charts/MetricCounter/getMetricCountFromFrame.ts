import { Motion } from "../../../motion";
import { COUNT_AT, COUNT_FRAMES } from "./MetricCounter.constants";
import type {
  GetMetricCounterBarsAndValueOptions as MetricCountOptions,
  GetMetricCounterBarsAndValueResult as MetricCountResult,
} from "./MetricCounter.types";

/**
 * Supplies MetricCounter with frame-specific rendering geometry or progress.
 */
export function getMetricCountFromFrame({
  input,
  frame,
  motion,
}: Readonly<MetricCountOptions>): MetricCountResult {
  const bars = input.bars;
  const t = motion.ramp(frame, COUNT_AT, motion.scale(COUNT_FRAMES));
  const value = Math.round(
    Motion.mix({
      t,
      from: 0,
      to: input.value,
    }),
  );
  return { bars, value };
}
