import { FunnelChart as MantineFunnelChart } from "@mantine/charts";
import { useMemo } from "react";
import { CHART_COLORS } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@utils/types/common.types";

type Props = {
  data: UnknownDataFrame;
  nameKey: string;
  valueKey: string;
  size?: number;
};

export function FunnelChart({
  data,
  nameKey,
  valueKey,
  size = 300,
}: Props): JSX.Element {
  const chartData = useMemo(() => {
    return data.map((row, index) => {
      const r = row as Record<string, unknown>;
      return {
        name: String(r[nameKey] ?? ""),
        value: Number(r[valueKey] ?? 0),
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [data, nameKey, valueKey]);

  return <MantineFunnelChart data={chartData} size={size} withLabels />;
}
