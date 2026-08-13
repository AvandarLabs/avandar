import { useMemo } from "react";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";
import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { UnknownDataFrame } from "@avandar/utils";
import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

/**
 * The value extent for one axis, or `undefined` when the axis has no
 * setting that needs it.
 *
 * The guard is the point: an axis with no minimum, maximum, or tick
 * interval never scans the data, so an unconfigured chart pays nothing.
 *
 * This covers the charts whose extent is a plain read of one column per
 * series. Bar and area compute their own, because their layouts stack
 * (and percent-stacking renormalizes to a 0-to-1 domain), which changes
 * what the extent even means.
 *
 * `seriesKey` names the field holding the column each series reads for
 * this axis: `"key"` for a Y axis, `"xKey"` for the value X axis that
 * scatter and bubble have. Naming the field rather than passing a
 * mapped array or a selector keeps every dependency a stable reference,
 * so the memo actually holds across renders.
 */
export function useAxisValueExtent<K extends string>(
  data: UnknownDataFrame,
  axisStyle: AxisStyle | undefined,
  series: ReadonlyArray<Record<K, string>>,
  seriesKey: K,
): ValueExtent | undefined {
  return useMemo(() => {
    if (!needsValueExtent(axisStyle)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s[seriesKey] };
      }),
    );
  }, [data, axisStyle, series, seriesKey]);
}
