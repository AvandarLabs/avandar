import { barLayoutToAreaLayout } from "$/models/vizs/ChartLayout.ts";
import { hydrateXYSeriesFromQuery } from "$/models/vizs/hydrateXYSeriesFromQuery.ts";
import { hydrateXYSeriesFromQueryResult } from "$/models/vizs/hydrateXYSeriesFromQueryResult.ts";
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { convertSeriesRenderAs } from "$/models/vizs/SeriesConfig.ts";
import { LEGEND_POSITION_OPTIONS } from "$/models/vizs/SettingDescriptor.ts";
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
  BarSeries,
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

const BAR_LAYOUT_OPTIONS = [
  { value: "group", label: "Grouped" },
  { value: "stack", label: "Stacked" },
  { value: "percent", label: "100% stacked" },
] as const;

const descriptors: VizSettingDescriptors<BarChartVizConfig, BarSeries> = {
  chart: [
    {
      key: "layout",
      label: "Bar layout",
      group: "Layout",
      control: { kind: "segmented", options: BAR_LAYOUT_OPTIONS },
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
    ...makeAxisDescriptors<BarChartVizConfig>({
      axis: "xAxis",
      role: "category",
      rotation: true,
    }),
    ...makeAxisDescriptors<BarChartVizConfig>({
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
      appliesTo: "bar",
      composable: true,
      label: "Color",
      group: "Style",
      control: { kind: "color" },
    },
    {
      key: "label",
      appliesTo: "bar",
      composable: true,
      label: "Series label",
      group: "Identity",
      control: { kind: "text", placeholder: "Defaults to column name" },
    },
    {
      key: "fillOpacity",
      appliesTo: "bar",
      composable: true,
      label: "Fill opacity",
      group: "Style",
      control: { kind: "number", min: 0, max: 1, step: 0.05 },
    },
    {
      key: "stackId",
      appliesTo: "bar",
      composable: true,
      label: "Stack group",
      group: "Style",
      control: { kind: "text", placeholder: "Series in the same group stack" },
    },
  ],
};

export const BarChartVizConfigs = {
  vizType: "bar",
  displayName: "Bar Chart",
  descriptors,

  makeEmptyConfig: (): BarChartVizConfig => {
    return {
      vizType: "bar",
      xAxisKey: undefined,
      series: [],
      layout: "group",
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: BarChartVizConfig,
    query: PartialStructuredQuery,
  ): BarChartVizConfig => {
    return hydrateXYSeriesFromQuery(vizConfig, query, "bar");
  },

  hydrateFromQueryResult: (
    vizConfig: BarChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): BarChartVizConfig => {
    return hydrateXYSeriesFromQueryResult(vizConfig, columns, "bar");
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: BarChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { xAxisKey, series, layout, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const pieAxes = { nameKey: xAxisKey, valueKey: firstSeries?.key };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (): BarChartVizConfig => {
        return vizConfig;
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
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "area");
          }) as XYSeries[],
          layout: barLayoutToAreaLayout(layout),
          withLegend,
          chartStyle,
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        const scatterSeries =
          xAxisKey !== undefined && firstSeries !== undefined ?
            [{ xKey: xAxisKey, key: firstSeries.key }]
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
        return {
          vizType,
          nameKey: xAxisKey,
          series: radarSeries,
          withLegend,
          chartStyle,
        };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        const bubbleSeries =
          xAxisKey !== undefined && firstSeries !== undefined ?
            [{ xKey: xAxisKey, key: firstSeries.key, sizeKey: firstSeries.key }]
          : [];
        return { vizType, series: bubbleSeries, chartStyle };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"bar">;
