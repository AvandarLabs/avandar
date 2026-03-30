/**
 * NOTE: This component uses Recharts directly instead of Mantine's
 * `AreaChart` wrapper. Mantine's wrapper wraps each series' gradient `<defs>`
 * and fill `Area` together in a React Fragment before handing the children to
 * Recharts. Recharts resolves graphical elements by reference inside
 * `filterFormatItem` (generateCategoricalChart.js), and the Fragment wrapping
 * causes the fill+stroke `Area` to be un-matched at render time — leaving
 * only the dots-only `Area` visible (dots, no line, no fill). The `areaProps`
 * escape hatch does not help because `withDots={false}` removes the only Area
 * that was successfully matching, resulting in a completely blank chart.
 *
 * Using Recharts directly avoids the Fragment wrapping issue entirely. The
 * external component API is identical to every other chart wrapper in this
 * directory, so nothing outside this file is affected.
 */
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Box } from "@mantine/core";
import { formatDate } from "@utils/dates/formatDate/formatDate";
import { useId, useMemo } from "react";
import { X_AXIS_PADDING } from "@/lib/ui/viz/ChartConstants";
import type { CurveType } from "$/models/vizs/CurveType";
import type { XYChartProps } from "@/lib/ui/viz/ChartTypes";

type Props = XYChartProps & {
  withLegend?: boolean;
  curveType?: CurveType;
  color?: string;
};

export function AreaChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
  dateColumns,
  dateFormat = "YYYY-MM-DD",
  timezone,
  withLegend = false,
  curveType = "monotone",
  color = "var(--mantine-color-blue-6)",
}: Props): JSX.Element {
  const gradientId = useId();
  const isDateAxis = dateColumns?.has(xAxisKey) ?? false;

  const tickFormatter = useMemo(() => {
    if (!isDateAxis) {
      return undefined;
    }
    return (value: unknown) => {
      return formatDate(value, { format: dateFormat, zone: timezone });
    };
  }, [isDateAxis, dateFormat, timezone]);

  const labelFormatter = useMemo(() => {
    if (!isDateAxis) {
      return undefined;
    }
    return (label: unknown) => {
      return formatDate(label, { format: dateFormat, zone: timezone });
    };
  }, [isDateAxis, dateFormat, timezone]);

  return (
    <Box h={height} w="100%">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data as Array<Record<string, unknown>>}
          margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="5 5"
            vertical={false}
            stroke="var(--mantine-color-gray-3)"
          />
          <XAxis
            dataKey={xAxisKey}
            padding={X_AXIS_PADDING}
            tickFormatter={tickFormatter}
            tick={{ fontSize: 12, fill: "currentColor" }}
            stroke=""
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={5}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "currentColor" }}
            stroke=""
            tickLine={false}
          />
          {withLegend ? <Legend verticalAlign="top" /> : null}
          <Tooltip labelFormatter={labelFormatter} />
          <Area
            type={curveType}
            dataKey={yAxisKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: "white",
              stroke: color,
              strokeWidth: 2,
            }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
