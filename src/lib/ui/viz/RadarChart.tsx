import { RadarChart as MantineRadarChart } from "@mantine/charts";
import { useMemo } from "react";
import type { UnknownDataFrame } from "@utils/types/common.types";

type Props = {
  data: UnknownDataFrame;
  nameKey: string;
  valueKey: string;
  color?: string;
  height?: number;
};

export function RadarChart({
  data,
  nameKey,
  valueKey,
  color = "blue.6",
  height = 300,
}: Props): JSX.Element {
  const series = useMemo(() => {
    return [{ name: valueKey, color, opacity: 0.2 }];
  }, [valueKey, color]);

  return (
    <MantineRadarChart
      h={height}
      w="100%"
      data={data as Array<Record<string, unknown>>}
      dataKey={nameKey}
      series={series}
      withTooltip
      withLegend
    />
  );
}
