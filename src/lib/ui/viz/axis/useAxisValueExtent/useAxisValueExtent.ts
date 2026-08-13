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
 * `seriesKey` identifies the series property containing the data-column key.
 */
export function useAxisValueExtent<K extends string>({
  data,
  axisStyle,
  series,
  seriesKey,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  axisStyle: Readonly<AxisStyle> | undefined;
  series: ReadonlyArray<Readonly<Record<K, string>>>;
  seriesKey: K;
}>): ValueExtent | undefined {
  return useMemo(() => {
    if (!needsValueExtent(axisStyle)) {
      return undefined;
    }
    return computeValueExtent({
      data,
      series: series.map((seriesEntry) => {
        return { key: seriesEntry[seriesKey] };
      }),
    });
  }, [data, axisStyle, series, seriesKey]);
}
