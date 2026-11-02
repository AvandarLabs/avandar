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
  AvaAreaSeries,
  AvaRadarSeries,
  AvaXYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizSettingDescriptors } from "$/models/vizs/SettingDescriptor.ts";

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

const descriptors: VizSettingDescriptors<AvaAreaChartVizConfig, AvaAreaSeries> =
  {
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
      makeLegendPositionDescriptor<AvaAreaChartVizConfig>(),
      ...makeAxisDescriptors<AvaAreaChartVizConfig>({
        axis: "xAxis",
        role: "category",
        rotation: true,
      }),
      ...makeAxisDescriptors<AvaAreaChartVizConfig>({
        axis: "yAxis",
        role: "value",
      }),
      ...makeGridDescriptors<AvaAreaChartVizConfig>(),
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

export const AvaAreaChartVizConfigs = {
  vizType: "area",
  displayName: "Area Chart",
  descriptors,

  makeEmptyConfig: (): AvaAreaChartVizConfig => {
    return {
      vizType: "area",
      xAxisKey: undefined,
      series: [],
      layout: "default",
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: AvaAreaChartVizConfig,
    query: PartialStructuredQuery,
  ): AvaAreaChartVizConfig => {
    return hydrateXYSeriesFromQuery(vizConfig, query, "area");
  },

  hydrateFromQueryResult: (
    vizConfig: AvaAreaChartVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaAreaChartVizConfig => {
    return hydrateXYSeriesFromQueryResult(vizConfig, columns, "area");
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaAreaChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const { xAxisKey, series, layout, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const pieAxes = { nameKey: xAxisKey, valueKey: firstSeries?.key };
    return match<VizType>(newVizType)
      .with("table", (vizType): AvaTableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): AvaBarChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "bar");
          }) as AvaXYSeries[],
          layout: ChartLayout.getBarLayoutFromAreaLayout(layout),
          withLegend,
          chartStyle,
        };
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
      .with("area", (): AvaAreaChartVizConfig => {
        return vizConfig;
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
} as const satisfies IAvaVizConfigModule<"area">;
