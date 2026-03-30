import { BarChart as MantineBarChart } from "@mantine/charts";
import { formatDate } from "@utils/dates/formatDate/formatDate";
import { useMemo } from "react";
import { X_AXIS_PADDING } from "@/lib/ui/viz/ChartConstants";
import type { XYChartProps } from "@/lib/ui/viz/ChartTypes";

type Props = XYChartProps & {
  withLegend?: boolean;
};

export function BarChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
  dateColumns,
  dateFormat = "YYYY-MM-DD",
  timezone,
  withLegend = false,
}: Props): JSX.Element {
  const series = useMemo(() => {
    return [{ name: yAxisKey }];
  }, [yAxisKey]);

  const isDateAxis = dateColumns?.has(xAxisKey) ?? false;

  const xAxisProps = useMemo(() => {
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

  return (
    <MantineBarChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      series={series}
      xAxisProps={xAxisProps}
      tooltipProps={tooltipProps}
      withLegend={withLegend}
    />
  );
}
