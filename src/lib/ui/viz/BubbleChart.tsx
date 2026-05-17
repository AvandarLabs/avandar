import { BubbleChart as MantineBubbleChart } from "@mantine/charts";
import { useMemo } from "react";
import { BUBBLE_SIZE_RANGE } from "@/lib/ui/viz/ChartConstants";
import { useVizDataLimit } from "@/lib/ui/viz/useVizDataLimit";
import type { UnknownDataFrame } from "@utils";

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
  const limitedData = useVizDataLimit("bubble", data);
  const dataKey = useMemo(() => {
    return { x: xAxisKey, y: yAxisKey, z: sizeKey };
  }, [xAxisKey, yAxisKey, sizeKey]);

  return (
    <MantineBubbleChart
      h={height}
      data={limitedData as Array<Record<string, unknown>>}
      dataKey={dataKey}
      range={BUBBLE_SIZE_RANGE}
    />
  );
}
