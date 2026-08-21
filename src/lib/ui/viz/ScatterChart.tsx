/**
 * NOTE: This component uses Recharts directly instead of Mantine's
 * `ScatterChart` wrapper. Mantine's legend maps `data[index].name` with no
 * bounds check, so removing a series while the legend is shown crashes when
 * the legend payload and the shrunk `data` array fall out of sync. Building
 * the Recharts elements directly (mirroring `BubbleChart`) avoids that,
 * renders per-series color/label explicitly, and lets each axis label carry
 * its own color instead of Mantine's single shared `axisLabel` style.
 */
import { Box } from "@mantine/core";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  ScatterChart as RechartsScatterChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

  return (
    <Box h={height} w="100%">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsScatterChart
          margin={{
            top: 10,
            right: 10,
            bottom: hasXLabel ? 30 : 0,
            left: hasYLabel ? 10 : 0,
          }}
        >
          <CartesianGrid {...styleProps.gridProps} />
          {styleProps.withXAxis !== false ?
            <XAxis
              dataKey="x"
              type="number"
              name="x"
              tickFormatter={(value) => {
                return formatChartNumber(value, { compact: true });
              }}
              {...styleProps.xAxisProps}
              label={
                hasXLabel ?
                  {
                    value: xLabel,
                    position: "insideBottom",
                    offset: -10,
                    fill: chartStyle?.xAxis?.labelColor,
                  }
                : undefined
              }
            />
          : null}
          {styleProps.withYAxis !== false ?
            <YAxis
              dataKey="y"
              type="number"
              name="y"
              width={hasYLabel ? 80 : 64}
              tickFormatter={(value) => {
                return formatChartNumber(value, { compact: true });
              }}
              {...styleProps.yAxisProps}
              label={
                hasYLabel ?
                  {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: chartStyle?.yAxis?.labelColor,
                  }
                : undefined
              }
            />
          : null}
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: unknown) => {
              return formatChartNumber(value);
            }}
          />
          {/*
           * Legend is always rendered (matching scatter's prior behaviour):
           * unlike Mantine's ScatterChart it reads names off the <Scatter>
           * elements rather than indexing data[index], so it is safe when the
           * series array shrinks, and a single-series scatter still shows its
           * label.
           */}
          <Legend {...styleProps.legendProps} />
          {scatterSeries.map((s, idx) => {
            return (
              <Scatter
                key={`${s.name}-${idx}`}
                name={s.name}
                data={s.data}
                fill={s.color}
              />
            );
          })}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}
