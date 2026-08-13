import { resolveAxisScale } from "@/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale";
import { resolveTickRotation } from "@/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { AxisStyle, ChartStyle } from "$/models/vizs/ChartStyle.types";
import type {
  AxisRole,
  AxisRoles,
} from "$/models/vizs/getAxisRoles/getAxisRoles";
import type { CSSProperties } from "react";
import type {
  CartesianGridProps,
  LegendProps,
  XAxisProps,
  YAxisProps,
} from "recharts";

const DEFAULT_TICK_FONT_SIZE = 12;

/**
 * Default Y-axis width that fits compact-formatted ticks (`1.5M`, `999.99B`)
 * plus a small margin. Mantine's default is too narrow for any reasonable
 * numeric scale and clips the labels.
 */
const DEFAULT_Y_AXIS_WIDTH = 64;

/**
 * Baseline tick styling. Mantine sets its own defaults on the tick
 * object, but `xAxisProps` spreads last, so any tick object we pass
 * replaces Mantine's wholesale rather than merging. Passing our
 * overrides on top of these keeps `fill: "currentColor"` (the
 * mechanism that makes ticks follow the theme) instead of dropping it.
 * `AreaChart` and `BubbleChart` render raw Recharts axes and never had
 * Mantine's defaults, so they gain the same styling here.
 */
const TICK_DEFAULTS = {
  fontSize: DEFAULT_TICK_FONT_SIZE,
  fill: "currentColor",
} as const;

/** Bar, line, and area: a category X axis over a value Y axis. */
const DEFAULT_AXIS_ROLES: AxisRoles = { x: "category", y: "value" };

/**
 * Format Y-axis ticks compactly so labels stay narrow regardless of
 * magnitude (`1.5K`, `2.3M`, `1.5B`). Tooltip / table use the verbose form.
 */
function _formatYAxisTick(value: unknown): string {
  return formatChartNumber(value, { compact: true });
}

/**
 * Compose the X axis's base props, tick styling, rotation, and numeric
 * scale into one Recharts prop object. `role` gates the scale: minimum,
 * maximum, and tick interval are meaningless on a category axis.
 */
function _resolveXAxisProps(
  xAxisStyle: AxisStyle | undefined,
  baseXAxisProps: Omit<XAxisProps, "ref"> | undefined,
  xExtent: ValueExtent | undefined,
  xTickLabels: readonly string[],
  role: AxisRole,
): Omit<XAxisProps, "ref"> {
  const rotation = resolveTickRotation(
    xAxisStyle?.tickAngle,
    xTickLabels,
    DEFAULT_TICK_FONT_SIZE,
  );
  const scale = role === "value" ? resolveAxisScale(xAxisStyle, xExtent) : {};

  const hasTickColor = xAxisStyle?.tickColor !== undefined;
  const hasRotation = rotation.tick !== undefined;

  // Only emit a tick object when something actually customizes it, so
  // an unstyled chart keeps whichever defaults its renderer supplies.
  const tick =
    hasTickColor || hasRotation ?
      {
        ...TICK_DEFAULTS,
        ...(hasTickColor ? { fill: xAxisStyle?.tickColor } : {}),
        ...(rotation.tick ?? {}),
      }
    : undefined;

  return {
    ...baseXAxisProps,
    ...(tick !== undefined ? { tick } : {}),
    ...(rotation.interval !== undefined ? { interval: rotation.interval } : {}),
    ...(rotation.height !== undefined ? { height: rotation.height } : {}),
    ...scale,
  };
}

/**
 * Compose the Y axis's defaults, tick styling, and numeric scale into
 * one Recharts prop object. `role` gates the scale, as on the X axis.
 */
function _resolveYAxisProps(
  yAxisStyle: AxisStyle | undefined,
  yExtent: ValueExtent | undefined,
  role: AxisRole,
): Omit<YAxisProps, "ref"> {
  const scale = role === "value" ? resolveAxisScale(yAxisStyle, yExtent) : {};
  const tick =
    yAxisStyle?.tickColor !== undefined ?
      { ...TICK_DEFAULTS, fill: yAxisStyle.tickColor }
    : undefined;

  return {
    tickFormatter: _formatYAxisTick,
    width: DEFAULT_Y_AXIS_WIDTH,
    ...(tick !== undefined ? { tick } : {}),
    ...scale,
  };
}

/**
 * Mantine GridChartBaseProps subset that the chart wrappers forward.
 */
export type ChartStyleProps = {
  withXAxis?: boolean;
  withYAxis?: boolean;
  xAxisProps?: Omit<XAxisProps, "ref">;
  yAxisProps?: Omit<YAxisProps, "ref">;
  gridProps?: Omit<CartesianGridProps, "ref">;
  gridColor?: string;
  legendProps?: Omit<LegendProps, "ref">;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /**
   * Passed to Mantine's `styles` prop. Used to apply axis label color via the
   * `axisLabel` slot (shared by both x and y labels). X-axis labelColor takes
   * priority over y-axis when both are set.
   */
  styles?: Partial<Record<string, CSSProperties>>;
};

/**
 * Everything a chart wrapper knows about its own data and shape that
 * {@link applyChartStyle} needs in order to resolve the style config.
 */
export type ApplyChartStyleOptions = {
  /**
   * Chart-specific X axis settings (padding, date tick formatter) that
   * `chartStyle` layers on top of.
   */
  baseXAxisProps?: Omit<XAxisProps, "ref">;

  /** Numeric range of the X axis data. Only used on a value X axis. */
  xExtent?: ValueExtent;

  /** Numeric range of the Y axis data. Only used on a value Y axis. */
  yExtent?: ValueExtent;

  /**
   * Formatted X tick label strings, used to size a rotated axis. Only
   * needed when `chartStyle.xAxis.tickAngle` is set.
   */
  xTickLabels?: readonly string[];

  /** Which axes carry numeric scales. Defaults to bar/line/area's shape. */
  axisRoles?: AxisRoles;
};

/**
 * Translate a {@link ChartStyle} config into the Mantine / Recharts
 * prop shape consumed by the chart wrappers.
 *
 * `options.baseXAxisProps` lets the caller layer chart-specific X axis
 * settings (padding, tick formatter for dates) on top; per-axis
 * `tick` / `label` from chartStyle override those when set. See
 * {@link ApplyChartStyleOptions} for the rest: data extents, tick
 * labels for rotation sizing, and per-axis roles.
 */
export function applyChartStyle(
  style: ChartStyle | undefined,
  options: ApplyChartStyleOptions = {},
): ChartStyleProps {
  const {
    baseXAxisProps,
    xExtent,
    yExtent,
    xTickLabels = [],
    axisRoles = DEFAULT_AXIS_ROLES,
  } = options;

  const xAxisStyle = style?.xAxis;
  const yAxisStyle = style?.yAxis;
  const gridStyle = style?.grid;
  const legendStyle = style?.legend;

  const xAxisProps = _resolveXAxisProps(
    xAxisStyle,
    baseXAxisProps,
    xExtent,
    xTickLabels,
    axisRoles.x,
  );
  const yAxisProps = _resolveYAxisProps(yAxisStyle, yExtent, axisRoles.y);

  const horizontal = gridStyle?.horizontal ?? true;
  const vertical = gridStyle?.vertical ?? false;
  const gridProps: Omit<CartesianGridProps, "ref"> = {
    horizontal,
    vertical,
    strokeDasharray: "5 5",
    ...(gridStyle?.color !== undefined ? { stroke: gridStyle.color } : {}),
  };

  const legendPosition = legendStyle?.position ?? "top";
  const legendProps: Omit<LegendProps, "ref"> = {
    verticalAlign:
      legendPosition === "bottom" ? "bottom"
      : legendPosition === "top" ? "top"
      : "middle",
    align:
      legendPosition === "left" ? "left"
      : legendPosition === "right" ? "right"
      : "center",
  };

  const xAxisLabel =
    xAxisStyle?.label !== undefined && xAxisStyle.label !== "" ?
      xAxisStyle.label
    : undefined;
  const yAxisLabel =
    yAxisStyle?.label !== undefined && yAxisStyle.label !== "" ?
      yAxisStyle.label
    : undefined;

  const axisLabelColor = xAxisStyle?.labelColor ?? yAxisStyle?.labelColor;
  const styles: Partial<Record<string, CSSProperties>> | undefined =
    axisLabelColor !== undefined ?
      { axisLabel: { fill: axisLabelColor } }
    : undefined;

  return {
    withXAxis: !(xAxisStyle?.hide ?? false),
    withYAxis: !(yAxisStyle?.hide ?? false),
    xAxisProps,
    yAxisProps,
    gridProps,
    gridColor: gridStyle?.color,
    legendProps,
    xAxisLabel,
    yAxisLabel,
    styles,
  };
}
