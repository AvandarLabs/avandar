import type { CartesianGridProps, LegendProps, XAxisProps, YAxisProps } from "recharts";
import type { ChartStyle } from "$/models/vizs/ChartStyle";

const DEFAULT_TICK_FONT_SIZE = 12;
const DEFAULT_AXIS_LABEL_OFFSET = -10;

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
  if (xAxisStyle?.label !== undefined && xAxisStyle.label !== "") {
    xAxisProps.label = {
      value: xAxisStyle.label,
      position: "insideBottom",
      offset: DEFAULT_AXIS_LABEL_OFFSET,
      fill: xAxisStyle.labelColor,
    };
  }

  const yAxisProps: Omit<YAxisProps, "ref"> = {};
  if (yAxisStyle?.tickColor !== undefined) {
    yAxisProps.tick = {
      fill: yAxisStyle.tickColor,
      fontSize: DEFAULT_TICK_FONT_SIZE,
    };
  }
  if (yAxisStyle?.label !== undefined && yAxisStyle.label !== "") {
    yAxisProps.label = {
      value: yAxisStyle.label,
      angle: -90,
      position: "insideLeft",
      fill: yAxisStyle.labelColor,
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

  return {
    withXAxis: !(xAxisStyle?.hide ?? false),
    withYAxis: !(yAxisStyle?.hide ?? false),
    xAxisProps,
    yAxisProps,
    gridProps,
    gridColor: gridStyle?.color,
    legendProps,
  };
}
