import type { ExtentSeries } from "@/lib/ui/viz/axis/getValueExtentFromSeries/getValueExtentFromSeries";

/** Assigns a shared stack id while preserving per-series overrides. */
export function applySharedStackId({
  series,
  sharedStackId,
}: Readonly<{
  series: readonly ExtentSeries[];
  sharedStackId: string | undefined;
}>): ExtentSeries[] {
  return series.map((extentSeries) => {
    return {
      key: extentSeries.key,
      stackId: extentSeries.stackId ?? sharedStackId,
    };
  });
}
