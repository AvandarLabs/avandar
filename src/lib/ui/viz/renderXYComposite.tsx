import { CompositeChart as MantineCompositeChart } from "@mantine/charts";
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
      barProps={(s) => {
        const found = series.find((sx) => {
          return sx.key === s.name;
        });
        if (found === undefined || found.renderAs !== "bar") {
          return {};
        }
        const overrides: Record<string, unknown> = {};
        if (found.fillOpacity !== undefined) {
          overrides.fillOpacity = found.fillOpacity;
        }
        if (found.stackId !== undefined) {
          overrides.stackId = found.stackId;
        }
        return overrides;
      }}
      lineProps={(s) => {
        const found = series.find((sx) => {
          return sx.key === s.name;
        });
        if (found === undefined || found.renderAs !== "line") {
          return {};
        }
        const overrides: Record<string, unknown> = {};
        if (found.strokeWidth !== undefined) {
          overrides.strokeWidth = found.strokeWidth;
        }
        if (found.curveType !== undefined) {
          overrides.type = found.curveType;
        }
        if (found.withDots !== undefined) {
          overrides.dot = found.withDots;
        }
        return overrides;
      }}
      areaProps={(s) => {
        const found = series.find((sx) => {
          return sx.key === s.name;
        });
        if (found === undefined || found.renderAs !== "area") {
          return {};
        }
        const overrides: Record<string, unknown> = {};
        if (found.strokeWidth !== undefined) {
          overrides.strokeWidth = found.strokeWidth;
        }
        if (found.fillOpacity !== undefined) {
          overrides.fillOpacity = found.fillOpacity;
        }
        if (found.curveType !== undefined) {
          overrides.type = found.curveType;
        }
        if (found.withDots !== undefined) {
          overrides.dot = found.withDots;
        }
        return overrides;
      }}
      {...styleProps}
    />
  );
}
