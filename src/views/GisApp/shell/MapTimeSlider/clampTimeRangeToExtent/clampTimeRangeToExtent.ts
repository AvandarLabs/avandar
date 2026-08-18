import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

function _isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Intersects a saved clock window with a queried extent.
 *
 * Unset `timeRange` stays unset. Unset `extent` leaves `timeRange` unchanged.
 * An empty intersection returns `undefined`.
 */
export function clampTimeRangeToExtent(options: {
  timeRange: AvaMapConfig.TimeRange | undefined;
  extent: AvaMapConfig.TimeRange | undefined;
}): AvaMapConfig.TimeRange | undefined {
  const { timeRange, extent } = options;
  if (timeRange === undefined) {
    return undefined;
  }
  if (extent === undefined) {
    return timeRange;
  }
  const startMs = Math.max(
    Date.parse(timeRange.start),
    Date.parse(extent.start),
  );
  const endMs = Math.min(Date.parse(timeRange.end), Date.parse(extent.end));
  if (startMs > endMs) {
    return undefined;
  }
  if (
    startMs === Date.parse(timeRange.start) &&
    endMs === Date.parse(timeRange.end)
  ) {
    return timeRange;
  }
  return { start: _isoFromMs(startMs), end: _isoFromMs(endMs) };
}
