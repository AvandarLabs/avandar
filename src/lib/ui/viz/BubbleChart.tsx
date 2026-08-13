/**
 * NOTE: This component uses Recharts directly instead of Mantine's
 * `BubbleChart` wrapper. Mantine's BubbleChart is single-series only
 * (one `dataKey` triple). We use Recharts directly to support per-series
 * `xKey`/`key`/`sizeKey` triples for Excel parity, where a bubble chart
 * can compare multiple independent clouds of bubbles on the same canvas.
 */
import { Box } from "@mantine/core";
import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
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
  ZAxis,
} from "recharts";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { useAxisValueExtent } from "@/lib/ui/viz/axis/useAxisValueExtent/useAxisValueExtent";
import {
  BUBBLE_SIZE_RANGE,
  CHART_COLOR_SWATCHES,
} from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  data: UnknownDataFrame;
  /** One entry per independent (X, Y, size) cloud of bubbles. */
  series: readonly BubbleSeries[];
  height?: number | string;
  chartStyle?: ChartStyle;
};

/**
 * Multi-series bubble chart (Excel parity). Each series carries its own
 * `xKey`, `key` (Y), and `sizeKey` so completely unrelated metric triples
 * can be compared on the same canvas.
 */
export function BubbleChart({
  data,
  series,
  height = 500,
  chartStyle,
}: Props): JSX.Element {
  const seriesData = useMemo(() => {
    return series.map((s) => {
      const points = data
        .map((row) => {
          const rowObject = row as Record<string, unknown>;
          return {
            x: Number(rowObject[s.xKey]),
            y: Number(rowObject[s.key]),
            z: Number(rowObject[s.sizeKey]),
          };
        })
        .filter((point) => {
          return (
            Number.isFinite(point.x) &&
            Number.isFinite(point.y) &&
            Number.isFinite(point.z)
          );
        });
      return { series: s, points };
    });
  }, [data, series]);

  // Both axes are value axes here, so the X extent comes from each
  // series' own `xKey` column rather than from a single category key.
  const xExtent = useAxisValueExtent(data, chartStyle?.xAxis, series, "xKey");
  const yExtent = useAxisValueExtent(data, chartStyle?.yAxis, series, "key");

  // A multi-series bubble chart draws X values from several columns, so
  // the tick labels come from the already-transformed point arrays
  // instead of from one keyed column.
  const xTickLabels = useMemo(() => {
    if (chartStyle?.xAxis?.tickAngle === undefined) {
      return undefined;
    }
    return seriesData.flatMap((entry) => {
      return entry.points.map((point) => {
        return formatChartNumber(point.x, { compact: true });
      });
    });
  }, [seriesData, chartStyle?.xAxis?.tickAngle]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      xExtent,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("bubble"),
    });
  }, [chartStyle, xExtent, yExtent, xTickLabels]);

  const showLegend = series.length > 1;

  const xLabelText = chartStyle?.xAxis?.label;
  const yLabelText = chartStyle?.yAxis?.label;
  const hasXLabel = xLabelText !== undefined && xLabelText !== "";
  const hasYLabel = yLabelText !== undefined && yLabelText !== "";

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
                    value: xLabelText,
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
              width={64}
              tickFormatter={(value) => {
                return formatChartNumber(value, { compact: true });
              }}
              {...styleProps.yAxisProps}
              label={
                hasYLabel ?
                  {
                    value: yLabelText,
                    angle: -90,
                    position: "insideLeft",
                    fill: chartStyle?.yAxis?.labelColor,
                  }
                : undefined
              }
            />
          : null}
          <ZAxis dataKey="z" type="number" range={BUBBLE_SIZE_RANGE} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: unknown) => {
              return formatChartNumber(value);
            }}
          />
          {showLegend ?
            <Legend {...styleProps.legendProps} />
          : null}
          {seriesData.map(({ series: s, points }, idx) => {
            const color =
              s.color ??
              CHART_COLOR_SWATCHES[idx % CHART_COLOR_SWATCHES.length]!;
            return (
              <Scatter
                key={`${s.key}-${idx}`}
                name={s.label ?? `${s.key} vs ${s.xKey}`}
                data={points}
                fill={color}
              />
            );
          })}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}
