import { rgba, useComputedColorScheme, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";

/**
 * The colors a plugin chart component draws with, so its marks, labels, and
 * grid lines match Avandar's built-in charts in the current color scheme.
 */
export type ChartTheme = Readonly<{
  /** Series colors, in the order built-in charts assign them. */
  colors: readonly string[];
  /** The color of axis ticks, axis labels, and legend text. */
  textColor: string;
  /** The color of grid lines. */
  gridColor: string;
}>;

// The Mantine palettes Avandar's built-in charts cycle through, in order,
// each at the shade those charts use. Keep in step with `CHART_COLORS` in
// `src/lib/ui/viz/ChartConstants.ts`.
const SERIES_COLOR_NAMES = [
  "blue",
  "teal",
  "yellow",
  "orange",
  "red",
  "grape",
  "indigo",
  "cyan",
  "green",
  "pink",
] as const;
const SERIES_COLOR_SHADE = 6;
const GRID_COLOR_ALPHA = 0.6;

/**
 * Gets Avandar's chart colors from the Mantine theme for the computed color
 * scheme, for example to color the `Scatter` and `ErrorBar` marks and the
 * axes of a plugin's `ComposedChart`. Text and grid colors follow light and
 * dark mode the way built-in charts do.
 */
export function useChartTheme(): ChartTheme {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  return useMemo(() => {
    const isDark = colorScheme === "dark";
    return {
      colors: SERIES_COLOR_NAMES.map((colorName) => {
        return theme.colors[colorName][SERIES_COLOR_SHADE];
      }),
      textColor: isDark ? theme.colors.dark[1] : theme.colors.gray[7],
      gridColor: rgba(
        isDark ? theme.colors.dark[3] : theme.colors.gray[5],
        GRID_COLOR_ALPHA,
      ),
    };
  }, [theme, colorScheme]);
}
