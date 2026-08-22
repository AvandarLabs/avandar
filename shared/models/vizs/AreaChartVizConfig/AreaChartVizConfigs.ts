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
  AreaSeries,
  RadarSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizSettingDescriptors } from "$/models/vizs/SettingDescriptor.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

import { match } from "ts-pattern";

import { hydrateXYSeriesFromQuery } from "$/models/vizs/hydrateXYSeriesFromQuery.ts";
import { hydrateXYSeriesFromQueryResult } from "$/models/vizs/hydrateXYSeriesFromQueryResult.ts";
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { convertSeriesRenderAs } from "$/models/vizs/SeriesConfig.ts";

const CURVE_TYPE_OPTIONS = [
  { value: "monotone", label: "Smooth" },
  { value: "linear", label: "Straight" },
  { value: "natural", label: "Natural" },
  { value: "step", label: "Step" },
] as const;

const AREA_LAYOUT_OPTIONS = [
  { value: "default", label: "Overlapping" },
  { value: "stacked", label: "Stacked" },
  { value: "percent", label: "100% stacked" },
  { value: "split", label: "Split (+/-)" },
] as const;

const LEGEND_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

const descriptors: VizSettingDescriptors<AreaChartVizConfig, AreaSeries> = {
  chart: [
    {
      key: "layout",
      label: "Area layout",
      group: "Layout",
      control: { kind: "segmented", options: AREA_LAYOUT_OPTIONS },
    },
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
    ...makeAxisDescriptors<AreaChartVizConfig>({
      axis: "xAxis",
      role: "category",
      rotation: true,
    }),
    ...makeAxisDescriptors<AreaChartVizConfig>({
      axis: "yAxis",
      role: "value",
    }),
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
      appliesTo: "area",
      composable: true,
      label: "Color",
      group: "Style",
      control: { kind: "color" },
    },
    {
      key: "label",
      appliesTo: "area",
      composable: true,
      label: "Series label",
      group: "Identity",
      control: { kind: "text", placeholder: "Defaults to column name" },
    },
    {
      key: "curveType",
      appliesTo: "area",
      composable: true,
      label: "Curve",
      group: "Style",
      control: { kind: "segmented", options: CURVE_TYPE_OPTIONS },
    },
    {
      key: "strokeWidth",
      appliesTo: "area",
      composable: true,
      label: "Stroke width",
      group: "Style",
      control: { kind: "number", min: 0, max: 8, step: 1, unit: "px" },
    },
    {
      key: "fillOpacity",
      appliesTo: "area",
      composable: true,
      label: "Fill opacity",
      group: "Style",
      control: { kind: "number", min: 0, max: 1, step: 0.05 },
    },
    {
      key: "withDots",
      appliesTo: "area",
      composable: true,
      label: "Show dots",
      group: "Style",
      control: { kind: "switch" },
    },
  ],
};

export const AreaChartVizConfigs = {
  vizType: "area",
  displayName: "Area Chart",
  descriptors,

  makeEmptyConfig: (): AreaChartVizConfig => {
    return {
      vizType: "area",
      xAxisKey: undefined,
      series: [],
      layout: "default",
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: AreaChartVizConfig,
    query: PartialStructuredQuery,
  ): AreaChartVizConfig => {
    return hydrateXYSeriesFromQuery(vizConfig, query, "area");
  },

  hydrateFromQueryResult: (
    vizConfig: AreaChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): AreaChartVizConfig => {
    return hydrateXYSeriesFromQueryResult(vizConfig, columns, "area");
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AreaChartVizConfig,
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
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "line");
          }) as XYSeries[],
          withLegend,
          chartStyle,
        };
      })
      .with("area", (): AreaChartVizConfig => {
        return vizConfig;
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        const scatterSeries =
          xAxisKey !== undefined && firstSeries !== undefined
            ? [{ xKey: xAxisKey, key: firstSeries.key }]
            : [];
        return { vizType, series: scatterSeries, chartStyle };
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
        const radarSeries: RadarSeries[] = firstSeries
          ? [
              {
                key: firstSeries.key,
                label: firstSeries.label,
                color: firstSeries.color,
              },
            ]
          : [];
        return { vizType, nameKey: xAxisKey, series: radarSeries, chartStyle };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        const bubbleSeries =
          xAxisKey !== undefined && firstSeries !== undefined
            ? [
                {
                  xKey: xAxisKey,
                  key: firstSeries.key,
                  sizeKey: firstSeries.key,
                },
              ]
            : [];
        return { vizType, series: bubbleSeries, chartStyle };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"area">;
