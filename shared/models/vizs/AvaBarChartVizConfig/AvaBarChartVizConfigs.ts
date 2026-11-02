import { match } from "ts-pattern";
import { ChartLayout } from "$/models/vizs/ChartLayout.ts";
import { hydrateXYSeriesFromQuery } from "$/models/vizs/hydrateXYSeriesFromQuery.ts";
import { hydrateXYSeriesFromQueryResult } from "$/models/vizs/hydrateXYSeriesFromQueryResult.ts";
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { makeGridDescriptors } from "$/models/vizs/makeGridDescriptors/makeGridDescriptors.ts";
import { makeLegendPositionDescriptor } from "$/models/vizs/makeLegendPositionDescriptor/makeLegendPositionDescriptor.ts";
import { convertSeriesRenderAs } from "$/models/vizs/SeriesConfig.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AvaAreaChartVizConfig } from "$/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfig.types.ts";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts";
import type { AvaBubbleChartVizConfig } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfig.types.ts";
import type { AvaFunnelChartVizConfig } from "$/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfig.types.ts";
import type { AvaLineChartVizConfig } from "$/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfig.types.ts";
import type { AvaPieChartVizConfig } from "$/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfig.types.ts";
import type { AvaRadarChartVizConfig } from "$/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfig.types.ts";
import type { AvaScatterPlotVizConfig } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfig.types.ts";
import type { AvaTableVizConfig } from "$/models/vizs/AvaTableVizConfig/AvaTableVizConfig.types.ts";
import type {
  AvaVizConfigType,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";
import type { IAvaVizConfigModule } from "$/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts";
import type {
  AvaBarSeries,
  AvaRadarSeries,
  AvaXYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizSettingDescriptors } from "$/models/vizs/SettingDescriptor.ts";

const BAR_LAYOUT_OPTIONS = [
  { value: "group", label: "Grouped" },
  { value: "stack", label: "Stacked" },
  { value: "percent", label: "100% stacked" },
] as const;

const descriptors: VizSettingDescriptors<AvaBarChartVizConfig, AvaBarSeries> = {
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
    makeLegendPositionDescriptor<AvaBarChartVizConfig>(),
    ...makeAxisDescriptors<AvaBarChartVizConfig>({
      axis: "xAxis",
      role: "category",
      rotation: true,
    }),
    ...makeAxisDescriptors<AvaBarChartVizConfig>({
      axis: "yAxis",
      role: "value",
    }),
    ...makeGridDescriptors<AvaBarChartVizConfig>(),
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

export const AvaBarChartVizConfigs = {
  vizType: "bar",
  displayName: "Bar Chart",
  descriptors,

  makeEmptyConfig: (): AvaBarChartVizConfig => {
    return {
      vizType: "bar",
      xAxisKey: undefined,
      series: [],
      layout: "group",
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: AvaBarChartVizConfig,
    query: PartialStructuredQuery,
  ): AvaBarChartVizConfig => {
    return hydrateXYSeriesFromQuery(vizConfig, query, "bar");
  },

  hydrateFromQueryResult: (
    vizConfig: AvaBarChartVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaBarChartVizConfig => {
    return hydrateXYSeriesFromQueryResult(vizConfig, columns, "bar");
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaBarChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const { xAxisKey, series, layout, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const pieAxes = { nameKey: xAxisKey, valueKey: firstSeries?.key };
    return match<VizType>(newVizType)
      .with("table", (vizType): AvaTableVizConfig => {
        return { vizType };
      })
      .with("bar", (): AvaBarChartVizConfig => {
        return vizConfig;
      })
      .with("line", (vizType): AvaLineChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "line");
          }) as AvaXYSeries[],
          withLegend,
          chartStyle,
        };
      })
      .with("area", (vizType): AvaAreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "area");
          }) as AvaXYSeries[],
          layout: ChartLayout.getAreaLayoutFromBarLayout(layout),
          withLegend,
          chartStyle,
        };
      })
      .with("scatter", (vizType): AvaScatterPlotVizConfig => {
        const scatterSeries =
          xAxisKey !== undefined && firstSeries !== undefined
            ? [{ xKey: xAxisKey, key: firstSeries.key }]
            : [];
        return { vizType, series: scatterSeries, chartStyle };
      })
      .with("pie", (vizType): AvaPieChartVizConfig => {
        return {
          vizType,
          ...pieAxes,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): AvaFunnelChartVizConfig => {
        return { vizType, ...pieAxes };
      })
      .with("radar", (vizType): AvaRadarChartVizConfig => {
        const radarSeries: AvaRadarSeries[] = firstSeries
          ? [
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
      .with("bubble", (vizType): AvaBubbleChartVizConfig => {
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
      }) as AvaVizConfigType<K>;
  },
} as const satisfies IAvaVizConfigModule<"bar">;
