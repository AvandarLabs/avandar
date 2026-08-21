import { ScatterChart as MantineScatterChart } from "@mantine/charts";
import { useMemo } from "react";
import { Label } from "recharts";
import { useScatterChartStyleProps } from "@/lib/ui/viz/axis/useScatterChartStyleProps";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ScatterChartSeries } from "@mantine/charts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  data: UnknownDataFrame;
  /** One entry per independent (X, Y) cloud of points. */
  series: readonly ScatterSeries[];
  height?: number | string;
  chartStyle?: ChartStyle;
};

/**
 * Multi-series scatter chart (Excel parity). Each series has its own
 * `xKey` / `key` (Y) pair so unrelated metric columns can share one canvas.
 */
export function ScatterChart({
  data,
  series,
  height = 500,
  chartStyle,
}: Props): JSX.Element {
  const scatterSeries: ScatterChartSeries[] = useMemo(() => {
    return series.map((s, idx) => {
      const color =
        s.color ?? CHART_COLOR_SWATCHES[idx % CHART_COLOR_SWATCHES.length]!;
      const points = data
        .map((row) => {
          const rowObject = row as Record<string, unknown>;
          return {
            x: Number(rowObject[s.xKey]),
            y: Number(rowObject[s.key]),
          };
        })
        .filter((point) => {
          return Number.isFinite(point.x) && Number.isFinite(point.y);
        });
      return {
        name: s.label ?? `${s.key} vs ${s.xKey}`,
        color,
        data: points,
      };
    });
  }, [data, series]);

  const styleProps = useScatterChartStyleProps({
    data,
    series,
    scatterSeries,
    chartStyle,
  });

  const isSingleSeries = series.length === 1;
  const firstSeries = series[0];
  const derivedXLabel =
    isSingleSeries && firstSeries !== undefined ? firstSeries.xKey : undefined;
  const derivedYLabel =
    isSingleSeries && firstSeries !== undefined ? firstSeries.key : undefined;
  const xLabel = chartStyle?.xAxis?.label ?? derivedXLabel;
  const yLabel = chartStyle?.yAxis?.label ?? derivedYLabel;
  const hasXLabel = xLabel !== undefined && xLabel !== "";
  const hasYLabel = yLabel !== undefined && yLabel !== "";

  // Mantine paints both axis labels through a single `styles.axisLabel` fill
  // (one shared `getStyles("axisLabel")` selector), so a per-axis label color
  // would collapse into one. Drop that shared mechanism and render our own
  // per-axis <Label> children with independent `fill`, matching AreaChart and
  // BubbleChart. The label *text* keeps scatter's column-name fallback
  // (`xLabel` / `yLabel`); only the color comes from `chartStyle`. Margins are
  // reserved manually since Mantine only reserves them for its own labels.
  const {
    styles: _sharedAxisLabelStyle,
    xAxisLabel: _xAxisLabel,
    yAxisLabel: _yAxisLabel,
    xAxisProps,
    yAxisProps,
    ...restStyleProps
  } = styleProps;

  return (
    <MantineScatterChart
      h={height}
      data={scatterSeries}
      dataKey={{ x: "x", y: "y" }}
      withLegend
      valueFormatter={formatChartNumber}
      xAxisProps={{
        ...xAxisProps,
        children:
          hasXLabel ?
            <Label
              value={xLabel}
              position="insideBottom"
              offset={-20}
              fontSize={12}
              fill={chartStyle?.xAxis?.labelColor}
            />
          : xAxisProps?.children,
      }}
      yAxisProps={{
        ...yAxisProps,
        // Widen to fit the rotated Y label.
        ...(hasYLabel ? { width: 80 } : {}),
        children:
          hasYLabel ?
            <Label
              value={yLabel}
              position="insideLeft"
              angle={-90}
              textAnchor="middle"
              offset={-5}
              fontSize={12}
              fill={chartStyle?.yAxis?.labelColor}
            />
          : yAxisProps?.children,
      }}
      scatterChartProps={
        hasXLabel || hasYLabel ?
          {
            margin: {
              bottom: hasXLabel ? 40 : undefined,
              left: hasYLabel ? 30 : undefined,
              right: hasYLabel ? 5 : undefined,
            },
          }
        : undefined
      }
      {...restStyleProps}
    />
  );
}
