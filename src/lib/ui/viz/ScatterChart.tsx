import { ScatterChart as MantineScatterChart } from "@mantine/charts";
import { useMemo } from "react";
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

  return (
    <MantineScatterChart
      h={height}
      data={scatterSeries}
      dataKey={{ x: "x", y: "y" }}
      withLegend
      valueFormatter={formatChartNumber}
      {...styleProps}
      // `applyChartStyle` only knows the *configured* label; scatter also
      // falls back to the column name when none is set, so these go
      // after the spread. Recharts renders both an axis `label` prop and
      // any `<Label>` child, so the label must come from exactly one
      // mechanism: Mantine's, which is also what carries `labelColor`
      // through `styles.axisLabel`.
      xAxisLabel={xLabel}
      yAxisLabel={yLabel}
      yAxisProps={{
        ...styleProps.yAxisProps,
        // Widen to fit the rotated Y label.
        ...(yLabel !== undefined ? { width: 80 } : {}),
      }}
      scatterChartProps={
        xLabel !== undefined || yLabel !== undefined ?
          {
            margin: {
              bottom: xLabel !== undefined ? 40 : undefined,
              left: yLabel !== undefined ? 30 : undefined,
              right: yLabel !== undefined ? 5 : undefined,
            },
          }
        : undefined
      }
    />
  );
}
