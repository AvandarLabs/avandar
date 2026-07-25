/**
 * Style configuration for the chart canvas (axes, grid, legend). This
 * lives on the host viz config and never travels with an embedded
 * series (it is intentionally *not* composable). When a line
 * series is dropped into a bar host, the line obeys the bar host's
 * axis and grid styling.
 *
 * For now this covers axes, grid, and legend. More granular styling
 * (padding, background, title, font sizes, tooltip styling, tick
 * formatters) can be added later.
 */
export type AxisStyle = {
  /** Display label for the axis (e.g. "Revenue (USD)"). */
  label?: string;

  /** CSS color for the axis label text. */
  labelColor?: string;

  /** CSS color for the tick label text. */
  tickColor?: string;

  /** Hide the axis line, ticks, and labels entirely. */
  hide?: boolean;
};

export type GridStyle = {
  /** CSS color for the grid lines. */
  color?: string;

  /** Show horizontal grid lines. Defaults to `true`. */
  horizontal?: boolean;

  /** Show vertical grid lines. Defaults to `false`. */
  vertical?: boolean;
};

export type LegendPosition = "top" | "bottom" | "left" | "right";

export type LegendStyle = {
  position?: LegendPosition;
};

export type ChartStyle = {
  xAxis?: AxisStyle;
  yAxis?: AxisStyle;
  grid?: GridStyle;
  legend?: LegendStyle;
};
