import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

import { clampTimeRangeToExtent } from "@/views/GisApp/shell/MapTimeSlider/clampTimeRangeToExtent/clampTimeRangeToExtent";

/**
 * Translates a clock window forward by its duration, or by `collapsedStepMs`
 * when start and end are the same instant, then clamps to `extent`.
 *
 * Returns the current range when the shifted start would fall after
 * `extent.end`.
 */
export function shiftTimeRange(options: {
  timeRange: AvaMapConfig.TimeRange;
  extent: AvaMapConfig.TimeRange;
  collapsedStepMs: number;
}): AvaMapConfig.TimeRange {
  const { timeRange, extent, collapsedStepMs } = options;
  const startMs = Date.parse(timeRange.start);
  const endMs = Date.parse(timeRange.end);
  const durationMs = startMs === endMs ? collapsedStepMs : endMs - startMs;
  const shiftedStartMs = startMs + durationMs;
  if (shiftedStartMs > Date.parse(extent.end)) {
    return timeRange;
  }
  return (
    clampTimeRangeToExtent({
      timeRange: {
        start: new Date(shiftedStartMs).toISOString(),
        end: new Date(endMs + durationMs).toISOString(),
      },
      extent,
    }) ?? timeRange
  );
}
