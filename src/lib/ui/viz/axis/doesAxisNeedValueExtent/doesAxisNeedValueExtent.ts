import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

/**
 * Whether an axis has any setting that requires knowing the data's
 * numeric range. Chart wrappers call this before scanning their data
 * so an unconfigured chart pays nothing.
 */
export function doesAxisNeedValueExtent(axis: AxisStyle | undefined): boolean {
  return (
    axis?.min !== undefined ||
    axis?.max !== undefined ||
    axis?.tickInterval !== undefined
  );
}
