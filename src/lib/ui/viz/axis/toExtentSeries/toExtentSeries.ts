import type { ExtentSeries } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";

/**
 * Resolve each series' stacking bucket for an extent calculation.
 *
 * `sharedStackId` is the id the renderer puts on every mark when the
 * chart's layout stacks (Mantine uses `"stack"` for bar, our AreaChart
 * uses `AREA_STACK_ID`), or `undefined` when the layout groups. A series
 * that declares its own `stackId` keeps it, mirroring how both renderers
 * let a per-series id override the layout-implied one.
 *
 * Input and output are both `ExtentSeries`: this narrows *which bucket*
 * each series belongs to, it does not change the shape.
 */
export function toExtentSeries(
  series: readonly ExtentSeries[],
  sharedStackId: string | undefined,
): ExtentSeries[] {
  return series.map((s) => {
    return { key: s.key, stackId: s.stackId ?? sharedStackId };
  });
}
