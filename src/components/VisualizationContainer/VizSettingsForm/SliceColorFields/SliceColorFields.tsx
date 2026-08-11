import { ColorInput, Stack } from "@mantine/core";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import type { ReactNode } from "react";

type Props = {
  /** Distinct slice names found in the query result, in first-seen order. */
  sliceNames: readonly string[];

  /** Current per-slice color overrides, keyed by slice name. */
  seriesColors: Record<string, string> | undefined;

  /** Called with the next override map when the user picks a color. */
  onSeriesColorsChange: (seriesColors: Record<string, string>) => void;
};

/**
 * One color picker per slice, for the visualizations that color by category
 * rather than by series. Shared by the pie and funnel forms, which present the
 * same override map.
 */
export function SliceColorFields({
  sliceNames,
  seriesColors,
  onSeriesColorsChange,
}: Props): ReactNode {
  return (
    <Stack gap="xs">
      {sliceNames.map((sliceName) => {
        return (
          <ColorInput
            key={sliceName}
            label={sliceName}
            value={seriesColors?.[sliceName] ?? ""}
            swatches={CHART_COLOR_SWATCHES}
            withEyeDropper={false}
            format="hex"
            onChange={(nextColor) => {
              // Clearing a color drops the key rather than storing an
              // `undefined` the config's type does not admit.
              const { [sliceName]: _clearedColor, ...keptColors } =
                seriesColors ?? {};
              onSeriesColorsChange(
                nextColor === "" ?
                  keptColors
                : { ...keptColors, [sliceName]: nextColor },
              );
            }}
          />
        );
      })}
    </Stack>
  );
}
