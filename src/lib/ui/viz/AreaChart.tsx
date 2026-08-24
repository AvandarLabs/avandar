/**
 * NOTE: This component uses Recharts directly instead of Mantine's
 * `AreaChart` wrapper. Mantine's wrapper wraps each series' gradient
 * `<defs>` and fill `Area` together in a React Fragment before
 * handing the children to Recharts. Recharts resolves graphical
 * elements by reference inside `filterFormatItem`
 * (generateCategoricalChart.js), and the Fragment wrapping causes the
 * fill+stroke `Area` to be un-matched at render time: leaving only
 * the dots-only `Area` visible (dots, no line, no fill). The
 * `areaProps` escape hatch does not help because `withDots={false}`
 * removes the only Area that was successfully matching, resulting in
 * a completely blank chart.
 *
 * Using Recharts directly avoids the Fragment wrapping issue
 * entirely. The mixed-renderAs path still uses Mantine's
 * `CompositeChart` since composite mode triggers different rendering
 * logic internally.
 */
import { formatDate, propEq } from "@avandar/utils";
import { Box } from "@mantine/core";
import { Fragment, useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  Legend,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAreaStackingFromLayout } from "@/lib/ui/viz/axis/getAreaStackingFromLayout/getAreaStackingFromLayout";
import { useAreaChartStyleProps } from "@/lib/ui/viz/axis/useAreaChartStyleProps";
import { X_AXIS_PADDING } from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import { renderXYComposite } from "@/lib/ui/viz/renderXYComposite";
import type { AreaLayout } from "@/lib/ui/viz/axis/getAreaStackingFromLayout/getAreaStackingFromLayout";
import type { XYChartProps } from "@/lib/ui/viz/ChartTypes";
import type { AreaSeries } from "$/models/vizs/SeriesConfig";

const DEFAULT_AREA_COLOR = "var(--mantine-color-blue-6)";
const DEFAULT_AREA_FILL_OPACITY = 0.6;
const DEFAULT_AREA_STROKE_WIDTH = 2;
const DEFAULT_AREA_DOT_RADIUS = 4;
const DEFAULT_AREA_CURVE = "monotone" as const;

type Props = XYChartProps & {
  /**
   * Area layout. "default" overlaps each series; "stacked" stacks
   * them; "percent" 100% stacks; "split" stacks positive and negative
   * values separately.
   */
  layout?: AreaLayout;
};

const STACK_OFFSET_FOR_LAYOUT: Record<
  NonNullable<Props["layout"]>,
  "none" | "expand" | "sign"
> = {
  default: "none",
  stacked: "none",
  percent: "expand",
  split: "sign",
};

export function AreaChart({
  data,
  xAxisKey,
  series,
  height = 500,
  dateColumns,
  dateFormat = "YYYY-MM-DD",
  timezone,
  withLegend = false,
  chartStyle,
  layout = "default",
}: Props): JSX.Element {
  const isDateAxis = dateColumns?.has(xAxisKey) ?? false;
  const gradientPrefix = useId();

  const baseXAxisProps = useMemo(() => {
    return { padding: X_AXIS_PADDING };
  }, []);

  const tickFormatter = useMemo(() => {
    if (!isDateAxis) {
      return undefined;
    }
    return (value: unknown): string => {
      return formatDate(value, { format: dateFormat, zone: timezone });
    };
  }, [isDateAxis, dateFormat, timezone]);

  const allAreas = series.every(propEq("renderAs", "area"));

  const styleProps = useAreaChartStyleProps({
    data,
    series,
    chartStyle,
    xAxisKey,
    tickFormatter,
    baseXAxisProps,
    layout,
    allAreas,
  });

  const xLabelText = chartStyle?.xAxis?.label;
  const yLabelText = chartStyle?.yAxis?.label;
  const hasXLabel = xLabelText !== undefined && xLabelText !== "";
  const hasYLabel = yLabelText !== undefined && yLabelText !== "";

  const labelFormatter = useMemo(() => {
    if (!isDateAxis) {
      return undefined;
    }
    return (label: unknown): string => {
      return formatDate(label, { format: dateFormat, zone: timezone });
    };
  }, [isDateAxis, dateFormat, timezone]);

  if (!allAreas) {
    return renderXYComposite({
      data,
      xAxisKey,
      series,
      height,
      withLegend,
      tooltipProps: { labelFormatter },
      styleProps,
      valueFormatter: formatChartNumber,
    });
  }

  const areaSeries = series as readonly AreaSeries[];
  // Same value the extent calculation bucketed by, so the drawn stacks
  // and the resolved domain can never disagree.
  const { sharedStackId } = getAreaStackingFromLayout(layout);
  const stackOffset = STACK_OFFSET_FOR_LAYOUT[layout];

  return (
    <Box h={height} w="100%">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data as Array<Record<string, unknown>>}
          margin={{
            top: 10,
            right: 10,
            bottom: hasXLabel ? 30 : 0,
            left: hasYLabel ? 10 : 0,
          }}
          stackOffset={stackOffset}
        >
          <defs>
            {areaSeries.map((s, idx) => {
              const color = s.color ?? DEFAULT_AREA_COLOR;
              const id = `${gradientPrefix}-${idx}`;
              const fillOpacity = s.fillOpacity ?? DEFAULT_AREA_FILL_OPACITY;
              return (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={color}
                    stopOpacity={fillOpacity * 0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={color}
                    stopOpacity={fillOpacity * 0.02}
                  />
                </linearGradient>
              );
            })}
          </defs>
          {styleProps.gridProps !== undefined ?
            <CartesianGrid {...styleProps.gridProps} />
          : null}
          {styleProps.withXAxis !== false ?
            <XAxis
              dataKey={xAxisKey}
              padding={X_AXIS_PADDING}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke=""
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={5}
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
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke=""
              tickLine={false}
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
          {withLegend ?
            <Legend {...styleProps.legendProps} />
          : null}
          <Tooltip
            labelFormatter={labelFormatter}
            formatter={(value: unknown) => {
              return formatChartNumber(value);
            }}
          />
          {areaSeries.map((s, idx) => {
            const color = s.color ?? DEFAULT_AREA_COLOR;
            const id = `${gradientPrefix}-${idx}`;
            const strokeWidth = s.strokeWidth ?? DEFAULT_AREA_STROKE_WIDTH;
            const showDots = s.withDots ?? true;
            const curveType = s.curveType ?? DEFAULT_AREA_CURVE;
            return (
              <Fragment key={`${s.key}-area`}>
                <Area
                  type={curveType}
                  dataKey={s.key}
                  name={s.label ?? s.key}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill={`url(#${id})`}
                  stackId={sharedStackId}
                  dot={
                    showDots ?
                      {
                        r: DEFAULT_AREA_DOT_RADIUS,
                        fill: color,
                        strokeWidth: 0,
                      }
                    : false
                  }
                  activeDot={{
                    r: 5,
                    fill: "white",
                    stroke: color,
                    strokeWidth: 2,
                  }}
                />
              </Fragment>
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
