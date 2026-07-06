import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber";
import type { ChartStyle } from "$/models/vizs/ChartStyle";
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
 * Format Y-axis ticks compactly so labels stay narrow regardless of
 * magnitude — `1.5K`, `2.3M`, `1.5B`. Tooltip / table use the verbose form.
 */
function _formatYAxisTick(value: unknown): string {
  return formatChartNumber(value, { compact: true });
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
 * Translate a {@link ChartStyle} config into the Mantine / Recharts
 * prop shape consumed by the chart wrappers.
 *
 * `baseXAxisProps` lets the caller layer chart-specific X axis
 * settings (padding, tick formatter for dates) on top; per-axis
 * `tick` / `label` from chartStyle override those when set.
 */
export function applyChartStyle(
  style: ChartStyle | undefined,
  baseXAxisProps?: Omit<XAxisProps, "ref">,
): ChartStyleProps {
  const xAxisStyle = style?.xAxis;
  const yAxisStyle = style?.yAxis;
  const gridStyle = style?.grid;
  const legendStyle = style?.legend;

  const xAxisProps: Omit<XAxisProps, "ref"> = { ...baseXAxisProps };
  if (xAxisStyle?.tickColor !== undefined) {
    xAxisProps.tick = {
      fill: xAxisStyle.tickColor,
      fontSize: DEFAULT_TICK_FONT_SIZE,
    };
  }

  const yAxisProps: Omit<YAxisProps, "ref"> = {
    tickFormatter: _formatYAxisTick,
    width: DEFAULT_Y_AXIS_WIDTH,
  };
  if (yAxisStyle?.tickColor !== undefined) {
    yAxisProps.tick = {
      fill: yAxisStyle.tickColor,
      fontSize: DEFAULT_TICK_FONT_SIZE,
    };
  }

  const horizontal = gridStyle?.horizontal ?? true;
  const vertical = gridStyle?.vertical ?? false;
  const gridProps: Omit<CartesianGridProps, "ref"> = {
    horizontal,
    vertical,
    strokeDasharray: "5 5",
  };
  if (gridStyle?.color !== undefined) {
    gridProps.stroke = gridStyle.color;
  }

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
