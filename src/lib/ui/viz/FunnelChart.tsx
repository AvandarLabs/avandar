import { FunnelChart as MantineFunnelChart } from "@mantine/charts";
import { useMemo } from "react";
import { CHART_COLORS } from "@/lib/ui/viz/ChartConstants";
import { useVizDataLimit } from "@/lib/ui/viz/useVizDataLimit";
import type { UnknownDataFrame } from "@utils";

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
  const limitedData = useVizDataLimit("funnel", data);
  const chartData = useMemo(() => {
    return limitedData.map((row, index) => {
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
  }, [limitedData, nameKey, valueKey, seriesColors]);

  return <MantineFunnelChart data={chartData} size={size} withLabels />;
}
