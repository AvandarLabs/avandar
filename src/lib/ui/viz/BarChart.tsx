import { formatDate, propEq } from "@avandar/utils";
import { BarChart as MantineBarChart } from "@mantine/charts";
import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";
import { toExtentSeries } from "@/lib/ui/viz/axis/toExtentSeries/toExtentSeries";
import { useXTickLabels } from "@/lib/ui/viz/axis/useXTickLabels/useXTickLabels";
import { X_AXIS_PADDING } from "@/lib/ui/viz/ChartConstants";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import { renderXYComposite } from "@/lib/ui/viz/renderXYComposite";
import type { XYChartProps } from "@/lib/ui/viz/ChartTypes";
import type { BarSeries } from "$/models/vizs/SeriesConfig";
import type { BarProps } from "recharts";

type Props = XYChartProps & {
  /**
   * Bar layout when every series renders as bars. Composite renders
   * (mixed `renderAs`) ignore this prop and always group.
   */
  layout?: "group" | "stack" | "percent";
};

const BAR_LAYOUT_TO_MANTINE: Record<
  NonNullable<Props["layout"]>,
  "default" | "stacked" | "percent"
> = {
  group: "default",
  stack: "stacked",
  percent: "percent",
};

export function BarChart({
  data,
  xAxisKey,
  series,
  height = 500,
  dateColumns,
  dateFormat = "YYYY-MM-DD",
  timezone,
  withLegend = false,
  chartStyle,
  layout = "group",
}: Props): JSX.Element {
  const isDateAxis = dateColumns?.has(xAxisKey) ?? false;

  const baseXAxisProps = useMemo(() => {
    if (!isDateAxis) {
      return { padding: X_AXIS_PADDING };
    }
    return {
      padding: X_AXIS_PADDING,
      tickFormatter: (value: unknown) => {
        return formatDate(value, { format: dateFormat, zone: timezone });
      },
    };
  }, [isDateAxis, dateFormat, timezone]);

  const tooltipProps = useMemo(() => {
    if (!isDateAxis) {
      return undefined;
    }
    return {
      labelFormatter: (label: unknown) => {
        return formatDate(label, { format: dateFormat, zone: timezone });
      },
    };
  }, [isDateAxis, dateFormat, timezone]);

  const valueFormatter = formatChartNumber;

  const allBars = series.every(propEq("renderAs", "bar"));

  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    // Percent layout sets Recharts `stackOffset: "expand"`, which
    // normalizes each column to sum to 1 and only formats the ticks as
    // percentages. The real domain is 0 to 1.
    if (allBars && layout === "percent") {
      return { min: 0, max: 1 };
    }
    // The composite renderer always groups, so a layout-implied stack
    // only applies when every series really is a bar.
    const layoutStacks = allBars && layout === "stack";
    return computeValueExtent(
      data,
      toExtentSeries(
        series.map((s) => {
          // `stackId` only exists on bar series, and `series` is a union.
          return {
            key: s.key,
            stackId: "stackId" in s ? s.stackId : undefined,
          };
        }),
        layoutStacks ? "stack" : undefined,
      ),
    );
  }, [data, series, layout, allBars, chartStyle?.yAxis]);

  const xTickLabels = useXTickLabels(
    data,
    xAxisKey,
    chartStyle?.xAxis?.tickAngle,
    baseXAxisProps.tickFormatter,
  );

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      baseXAxisProps,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("bar"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);

  if (!allBars) {
    return renderXYComposite({
      data,
      xAxisKey,
      series,
      height,
      withLegend,
      tooltipProps,
      styleProps,
      valueFormatter,
    });
  }

  const barSeries = series as readonly BarSeries[];
  return (
    <MantineBarChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      type={BAR_LAYOUT_TO_MANTINE[layout]}
      withLegend={withLegend}
      tooltipProps={tooltipProps}
      valueFormatter={valueFormatter}
      series={barSeries.map((s) => {
        return { name: s.key, label: s.label, color: s.color };
      })}
      barProps={(s): Partial<Omit<BarProps, "ref">> => {
        const found = barSeries.find(propEq("key", s.name));
        if (found === undefined) {
          return {};
        }
        return {
          ...(found.fillOpacity !== undefined ?
            { fillOpacity: found.fillOpacity }
          : {}),
          ...(found.stackId !== undefined ? { stackId: found.stackId } : {}),
        };
      }}
      {...styleProps}
    />
  );
}
