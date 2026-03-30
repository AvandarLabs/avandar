import {
  DonutChart,
  PieChart as MantinePieChart,
} from "@mantine/charts";
import { useMemo } from "react";
import { CHART_COLORS } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@utils/types/common.types";

type Props = {
  data: UnknownDataFrame;
  nameKey: string;
  valueKey: string;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
  size?: number;
};

export function PieChart({
  data,
  nameKey,
  valueKey,
  isDonut,
  withLabels,
  labelsType,
  seriesColors,
  size = 300,
}: Props): JSX.Element {
  const chartData = useMemo(() => {
    return data.map((row, index) => {
      const r = row as Record<string, unknown>;
      const name = String(r[nameKey] ?? "");
      return {
        name,
        value: Number(r[valueKey] ?? 0),
        color:
          seriesColors?.[name] ??
          CHART_COLORS[index % CHART_COLORS.length] ??
          "blue.6",
      };
    });
  }, [data, nameKey, valueKey, seriesColors]);

  if (isDonut) {
    return (
      <DonutChart
        data={chartData}
        size={size}
        withLabels={withLabels}
        labelsType={labelsType}
      />
    );
  }

  return (
    <MantinePieChart
      data={chartData}
      size={size}
      withLabels={withLabels}
      labelsType={labelsType}
    />
  );
}
