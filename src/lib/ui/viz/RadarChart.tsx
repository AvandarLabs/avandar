import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { RadarSeries } from "$/models/vizs/SeriesConfig";
import type { UnknownDataFrame } from "@avandar/utils";

import { RadarChart as MantineRadarChart } from "@mantine/charts";
import { useMemo } from "react";

type Props = {
  data: UnknownDataFrame;
  nameKey: string;
  series: readonly RadarSeries[];
  height?: number | string;
  withLegend?: boolean;
  chartStyle?: ChartStyle;
};

const DEFAULT_FILL_OPACITY = 0.2;

export function RadarChart({
  data,
  nameKey,
  series,
  height = 300,
  withLegend = true,
  chartStyle,
}: Props): JSX.Element {
  const mantineSeries = useMemo(() => {
    return series.map((s) => {
      return {
        name: s.key,
        label: s.label,
        color: s.color ?? "blue.6",
        opacity: s.fillOpacity ?? DEFAULT_FILL_OPACITY,
        strokeWidth: s.strokeWidth,
      };
    });
  }, [series]);

  const legendProps = useMemo(() => {
    const position = chartStyle?.legend?.position ?? "top";
    return {
      verticalAlign:
        position === "bottom"
          ? "bottom"
          : position === "top"
            ? "top"
            : "middle",
      align:
        position === "left"
          ? "left"
          : position === "right"
            ? "right"
            : "center",
    } as const;
  }, [chartStyle?.legend?.position]);

  return (
    <MantineRadarChart
      h={height}
      w="100%"
      data={data as Array<Record<string, unknown>>}
      dataKey={nameKey}
      series={mantineSeries}
      withTooltip
      withLegend={withLegend}
      legendProps={legendProps}
    />
  );
}
