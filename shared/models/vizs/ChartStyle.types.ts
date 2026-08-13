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

  /**
   * Lower bound of a value axis. Unset means derive it from the data
   * (zero-anchored when the data is non-negative). Ignored on a
   * category axis.
   */
  min?: number;

  /**
   * Upper bound of a value axis. Unset means derive it from the data.
   * Ignored on a category axis.
   */
  max?: number;

  /**
   * Step between ticks on a value axis, in data units (Excel's "major
   * unit"). Recharts has no step prop, so this generates an explicit
   * tick array. Ignored on a category axis.
   */
  tickInterval?: number;

  /**
   * Tick label rotation in degrees, -90 to 90. Unset or `0` means
   * horizontal. The X axis uses this field; other axes ignore it.
   */
  tickAngle?: number;
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
