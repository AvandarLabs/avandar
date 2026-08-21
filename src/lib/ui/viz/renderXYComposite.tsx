import { propEq } from "@avandar/utils";
import { CompositeChart as MantineCompositeChart } from "@mantine/charts";
import { Label } from "recharts";
import type { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { UnknownDataFrame } from "@avandar/utils";
import type { CompositeChartSeries } from "@mantine/charts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { XYSeries } from "$/models/vizs/SeriesConfig";
import type { ComponentProps } from "react";

type Props = {
  data: UnknownDataFrame;
  xAxisKey: string;
  series: readonly XYSeries[];
  height: number | string;
  withLegend: boolean;
  tooltipProps?: ComponentProps<typeof MantineCompositeChart>["tooltipProps"];
  styleProps: ReturnType<typeof applyChartStyle>;
  valueFormatter?: (value: number) => string;
  chartStyle?: ChartStyle;
};

/**
 * Renders an XY chart whose series mix `renderAs` types (bar / line /
 * area), via Mantine's CompositeChart. Series-specific settings
 * (strokeWidth, fillOpacity, curveType, withDots, stackId) are
 * applied per-series via the `barProps` / `lineProps` / `areaProps`
 * callbacks.
 */
export function renderXYComposite({
  data,
  xAxisKey,
  series,
  height,
  withLegend,
  tooltipProps,
  styleProps,
  valueFormatter,
  chartStyle,
}: Props): JSX.Element {
  const compositeSeries: CompositeChartSeries[] = series.map((s) => {
    return { name: s.key, label: s.label, color: s.color, type: s.renderAs };
  });

  // Mantine collapses both axis labels into one shared `styles.axisLabel` fill.
  // Render per-axis <Label> children with their own `fill`; reserve margins.
  const {
    styles: _sharedAxisLabelStyle,
    xAxisLabel: _xAxisLabel,
    yAxisLabel: _yAxisLabel,
    xAxisProps,
    yAxisProps,
    ...restStyleProps
  } = styleProps;

  const xLabelText = chartStyle?.xAxis?.label;
  const yLabelText = chartStyle?.yAxis?.label;
  const hasXLabel = xLabelText !== undefined && xLabelText !== "";
  const hasYLabel = yLabelText !== undefined && yLabelText !== "";

  return (
    <MantineCompositeChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      series={compositeSeries}
      withLegend={withLegend}
      tooltipProps={tooltipProps}
      valueFormatter={valueFormatter}
      barProps={(s) => {
        const found = series.find(propEq("key", s.name));
        if (found === undefined || found.renderAs !== "bar") {
          return {};
        }
        return {
          ...(found.fillOpacity !== undefined ?
            { fillOpacity: found.fillOpacity }
          : {}),
          ...(found.stackId !== undefined ? { stackId: found.stackId } : {}),
        };
      }}
      lineProps={(s) => {
        const found = series.find(propEq("key", s.name));
        if (found === undefined || found.renderAs !== "line") {
          return {};
        }
        return {
          ...(found.strokeWidth !== undefined ?
            { strokeWidth: found.strokeWidth }
          : {}),
          ...(found.curveType !== undefined ? { type: found.curveType } : {}),
          ...(found.withDots !== undefined ? { dot: found.withDots } : {}),
        };
      }}
      areaProps={(s) => {
        const found = series.find(propEq("key", s.name));
        if (found === undefined || found.renderAs !== "area") {
          return {};
        }
        return {
          ...(found.strokeWidth !== undefined ?
            { strokeWidth: found.strokeWidth }
          : {}),
          ...(found.fillOpacity !== undefined ?
            { fillOpacity: found.fillOpacity }
          : {}),
          ...(found.curveType !== undefined ? { type: found.curveType } : {}),
          ...(found.withDots !== undefined ? { dot: found.withDots } : {}),
        };
      }}
      composedChartProps={{
        margin: {
          bottom: hasXLabel ? 30 : undefined,
          left: hasYLabel ? 10 : undefined,
          right: hasYLabel ? 5 : undefined,
        },
      }}
      xAxisProps={{
        ...xAxisProps,
        children:
          hasXLabel ?
            <Label
              value={xLabelText}
              position="insideBottom"
              offset={-20}
              fontSize={12}
              fill={chartStyle?.xAxis?.labelColor}
            />
          : xAxisProps?.children,
      }}
      yAxisProps={{
        ...yAxisProps,
        children:
          hasYLabel ?
            <Label
              value={yLabelText}
              position="insideLeft"
              angle={-90}
              textAnchor="middle"
              offset={-5}
              fontSize={12}
              fill={chartStyle?.yAxis?.labelColor}
            />
          : yAxisProps?.children,
      }}
      {...restStyleProps}
    />
  );
}
