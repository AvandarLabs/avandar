import { ScatterChart as MantineScatterChart } from "@mantine/charts";
import { useMemo } from "react";
import { CHART_COLOR_SWATCHES } from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ScatterChartSeries } from "@mantine/charts";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  data: UnknownDataFrame;
  /** One entry per independent (X, Y) cloud of points. */
  series: readonly ScatterSeries[];
  height?: number | string;
};

/**
 * Multi-series scatter chart (Excel parity). Each series has its own
 * `xKey` / `key` (Y) pair so unrelated metric columns can share one canvas.
 */
export function ScatterChart({
  data,
  series,
  height = 500,
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

  const isSingleSeries = series.length === 1;
  const firstSeries = series[0];
  const xLabel =
    isSingleSeries && firstSeries !== undefined ? firstSeries.xKey : undefined;
  const yLabel =
    isSingleSeries && firstSeries !== undefined ? firstSeries.key : undefined;

  return (
    <MantineScatterChart
      h={height}
      data={scatterSeries}
      dataKey={{ x: "x", y: "y" }}
      withLegend
      valueFormatter={formatChartNumber}
      xAxisProps={
        xLabel !== undefined ?
          {
            label: {
              value: xLabel,
              position: "insideBottom",
              offset: -15,
              fontSize: 12,
            },
          }
        : undefined
      }
      yAxisProps={
        yLabel !== undefined ?
          {
            width: 80,
            label: {
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: -15,
              fontSize: 12,
            },
          }
        : undefined
      }
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
