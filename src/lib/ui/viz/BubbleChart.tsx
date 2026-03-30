import { BubbleChart as MantineBubbleChart } from "@mantine/charts";
import { useMemo } from "react";
import { BUBBLE_SIZE_RANGE } from "@/lib/ui/viz/ChartConstants";
import type { UnknownDataFrame } from "@utils/types/common.types";

type Props = {
  data: UnknownDataFrame;
  xAxisKey: string;
  yAxisKey: string;
  sizeKey: string;
  height?: number;
};

export function BubbleChart({
  data,
  xAxisKey,
  yAxisKey,
  sizeKey,
  height = 500,
}: Props): JSX.Element {
  const dataKey = useMemo(() => {
    return { x: xAxisKey, y: yAxisKey, z: sizeKey };
  }, [xAxisKey, yAxisKey, sizeKey]);

  return (
    <MantineBubbleChart
      h={height}
      data={data as Array<Record<string, unknown>>}
      dataKey={dataKey}
      range={BUBBLE_SIZE_RANGE}
    />
  );
}
