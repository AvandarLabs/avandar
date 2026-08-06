import { hydrateXYSeriesFromQuery } from "$/models/vizs/hydrateXYSeriesFromQuery.ts";
import { hydrateXYSeriesFromQueryResult } from "$/models/vizs/hydrateXYSeriesFromQueryResult.ts";
import { convertSeriesRenderAs } from "$/models/vizs/SeriesConfig.ts";
import { match } from "ts-pattern";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types.ts";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types.ts";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type {
  LineSeries,
  RadarSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type {
  AnyVizSettingDescriptors,
  VizSettingDescriptors,
} from "$/models/vizs/SettingDescriptor.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

const CURVE_TYPE_OPTIONS = [
  { value: "monotone", label: "Smooth" },
  { value: "linear", label: "Straight" },
  { value: "natural", label: "Natural" },
  { value: "step", label: "Step" },
] as const;

const LEGEND_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

const descriptors: VizSettingDescriptors<LineChartVizConfig, LineSeries> = {
  chart: [
    {
      key: "withLegend",
      label: "Show legend",
      group: "Legend",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.legend.position",
      label: "Legend position",
      group: "Legend",
      control: { kind: "segmented", options: LEGEND_POSITION_OPTIONS },
    },
    {
      key: "chartStyle.xAxis.label",
      label: "X axis label",
      group: "X axis",
      control: { kind: "text" },
    },
    {
      key: "chartStyle.xAxis.labelColor",
      label: "X axis label color",
      group: "X axis",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.xAxis.tickColor",
      label: "X axis tick color",
      group: "X axis",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.xAxis.hide",
      label: "Hide X axis",
      group: "X axis",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.yAxis.label",
      label: "Y axis label",
      group: "Y axis",
      control: { kind: "text" },
    },
    {
      key: "chartStyle.yAxis.labelColor",
      label: "Y axis label color",
      group: "Y axis",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.yAxis.tickColor",
      label: "Y axis tick color",
      group: "Y axis",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.yAxis.hide",
      label: "Hide Y axis",
      group: "Y axis",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.grid.color",
      label: "Gridline color",
      group: "Grid",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.grid.horizontal",
      label: "Horizontal gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.grid.vertical",
      label: "Vertical gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
  ],
  series: [
    {
      key: "color",
      appliesTo: "line",
      composable: true,
      label: "Color",
      group: "Style",
      control: { kind: "color" },
    },
    {
      key: "label",
      appliesTo: "line",
      composable: true,
      label: "Series label",
      group: "Identity",
      control: { kind: "text", placeholder: "Defaults to column name" },
    },
    {
      key: "curveType",
      appliesTo: "line",
      composable: true,
      label: "Curve",
      group: "Style",
      control: { kind: "segmented", options: CURVE_TYPE_OPTIONS },
    },
    {
      key: "strokeWidth",
      appliesTo: "line",
      composable: true,
      label: "Line width",
      group: "Style",
      control: { kind: "number", min: 1, max: 8, step: 1, unit: "px" },
    },
    {
      key: "withDots",
      appliesTo: "line",
      composable: true,
      label: "Show dots",
      group: "Style",
      control: { kind: "switch" },
    },
  ],
};

export const LineChartVizConfigs = {
  vizType: "line",
  displayName: "Line Chart",
  descriptors: descriptors as unknown as AnyVizSettingDescriptors,

  makeEmptyConfig: (): LineChartVizConfig => {
    return {
      vizType: "line",
      xAxisKey: undefined,
      series: [],
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: LineChartVizConfig,
    query: PartialStructuredQuery,
  ): LineChartVizConfig => {
    return hydrateXYSeriesFromQuery(vizConfig, query, "line");
  },

  hydrateFromQueryResult: (
    vizConfig: LineChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): LineChartVizConfig => {
    return hydrateXYSeriesFromQueryResult(vizConfig, columns, "line");
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: LineChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { xAxisKey, series, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const pieAxes = { nameKey: xAxisKey, valueKey: firstSeries?.key };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "bar");
          }) as XYSeries[],
          layout: "group",
          withLegend,
          chartStyle,
        };
      })
      .with("line", (): LineChartVizConfig => {
        return vizConfig;
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "area");
          }) as XYSeries[],
          layout: "default",
          withLegend,
          chartStyle,
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        const scatterSeries =
          xAxisKey !== undefined && firstSeries !== undefined ?
            [{ xKey: xAxisKey, key: firstSeries.key }]
          : [];
        return { vizType, series: scatterSeries };
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          ...pieAxes,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): FunnelChartVizConfig => {
        return { vizType, ...pieAxes };
      })
      .with("radar", (vizType): RadarChartVizConfig => {
        const radarSeries: RadarSeries[] =
          firstSeries ?
            [
              {
                key: firstSeries.key,
                label: firstSeries.label,
                color: firstSeries.color,
              },
            ]
          : [];
        return { vizType, nameKey: xAxisKey, series: radarSeries };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        const bubbleSeries =
          xAxisKey !== undefined && firstSeries !== undefined ?
            [{ xKey: xAxisKey, key: firstSeries.key, sizeKey: firstSeries.key }]
          : [];
        return { vizType, series: bubbleSeries };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"line">;
