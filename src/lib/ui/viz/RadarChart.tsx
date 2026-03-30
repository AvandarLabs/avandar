import { RadarChart as MantineRadarChart } from "@mantine/charts";
import { useMemo } from "react";
import type { UnknownDataFrame } from "@utils/types/common.types";

type Props = {
  data: UnknownDataFrame;
  nameKey: string;
  valueKey: string;
  height?: number;
};

export function RadarChart({
  data,
  nameKey,
  valueKey,
  height = 300,
}: Props): JSX.Element {
  const series = useMemo(() => {
    return [{ name: valueKey, color: "blue.6", opacity: 0.2 }];
  }, [valueKey]);

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
