import { FunnelChart as MantineFunnelChart } from "@mantine/charts";
import { useMemo } from "react";
import { CHART_COLORS } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@utils/types/common.types";

type Props = {
  data: UnknownDataFrame;
  nameKey: string;
  valueKey: string;
  seriesColors?: Record<string, string>;
  size?: number;
};

export function FunnelChart({
  data,
  nameKey,
  valueKey,
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

  return <MantineFunnelChart data={chartData} size={size} withLabels />;
}
