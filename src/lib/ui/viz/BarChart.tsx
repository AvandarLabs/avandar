import { formatDate, propEq } from "@avandar/utils";
import { BarChart as MantineBarChart } from "@mantine/charts";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle";
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

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, baseXAxisProps);
  }, [chartStyle, baseXAxisProps]);

  const allBars = series.every(propEq("renderAs", "bar"));

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
