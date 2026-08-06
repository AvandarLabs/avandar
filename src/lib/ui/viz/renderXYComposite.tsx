import { CompositeChart as MantineCompositeChart } from "@mantine/charts";
import { propEq } from "@utils";
import type { applyChartStyle } from "@/lib/ui/viz/applyChartStyle";
import type { CompositeChartSeries } from "@mantine/charts";
import type { UnknownDataFrame } from "@utils";
import type { XYSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  data: UnknownDataFrame;
  xAxisKey: string;
  series: readonly XYSeries[];
  height: number | string;
  withLegend: boolean;
  tooltipProps?: unknown;
  styleProps: ReturnType<typeof applyChartStyle>;
  valueFormatter?: (value: number) => string;
};

/**
 * Renders an XY chart whose series mix `renderAs` types (bar / line /
 * area), via Mantine's CompositeChart. Series-specific settings
 * (strokeWidth, fillOpacity, curveType, withDots, stackId) are
 * applied per-series via the `barProps` / `lineProps` / `areaProps`
 * callbacks.
 */
export function renderXYComposite({
  data,
  xAxisKey,
  series,
  height,
  withLegend,
  tooltipProps,
  styleProps,
  valueFormatter,
}: Props): JSX.Element {
  const compositeSeries: CompositeChartSeries[] = series.map((s) => {
    return { name: s.key, label: s.label, color: s.color, type: s.renderAs };
  });

  return (
    <MantineCompositeChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      series={compositeSeries}
      withLegend={withLegend}
      tooltipProps={tooltipProps as never}
      valueFormatter={valueFormatter}
      barProps={(s) => {
        const found = series.find(propEq("key", s.name));
        if (found === undefined || found.renderAs !== "bar") {
          return {};
        }
        return {
          ...(found.fillOpacity !== undefined ?
            { fillOpacity: found.fillOpacity }
          : {}),
          ...(found.stackId !== undefined ? { stackId: found.stackId } : {}),
        };
      }}
      lineProps={(s) => {
        const found = series.find(propEq("key", s.name));
        if (found === undefined || found.renderAs !== "line") {
          return {};
        }
        return {
          ...(found.strokeWidth !== undefined ?
            { strokeWidth: found.strokeWidth }
          : {}),
          ...(found.curveType !== undefined ? { type: found.curveType } : {}),
          ...(found.withDots !== undefined ? { dot: found.withDots } : {}),
        };
      }}
      areaProps={(s) => {
        const found = series.find(propEq("key", s.name));
        if (found === undefined || found.renderAs !== "area") {
          return {};
        }
        return {
          ...(found.strokeWidth !== undefined ?
            { strokeWidth: found.strokeWidth }
          : {}),
          ...(found.fillOpacity !== undefined ?
            { fillOpacity: found.fillOpacity }
          : {}),
          ...(found.curveType !== undefined ? { type: found.curveType } : {}),
          ...(found.withDots !== undefined ? { dot: found.withDots } : {}),
        };
      }}
      {...styleProps}
    />
  );
}
