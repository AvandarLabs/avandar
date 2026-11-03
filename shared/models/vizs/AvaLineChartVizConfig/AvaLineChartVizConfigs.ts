import { match } from "ts-pattern";
import { convertSeriesRenderAs } from "$/models/vizs/convertSeriesRenderAs/convertSeriesRenderAs.ts";
import { makeAxisDescriptors } from "$/models/vizs/descriptors/makeAxisDescriptors/makeAxisDescriptors.ts";
import { makeGridDescriptors } from "$/models/vizs/descriptors/makeGridDescriptors/makeGridDescriptors.ts";
import { makeLegendPositionDescriptor } from "$/models/vizs/descriptors/makeLegendPositionDescriptor/makeLegendPositionDescriptor.ts";
import { hydrateXYSeriesFromQuery } from "$/models/vizs/hydrations/fromQuery/hydrateXYSeriesFromQuery.ts";
import { hydrateXYSeriesFromQueryResult } from "$/models/vizs/hydrations/fromQueryResult/hydrateXYSeriesFromQueryResult.ts";
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
  AvaLineSeries,
  AvaRadarSeries,
  AvaXYSeries,
} from "$/models/vizs/series.types.ts";
import type { VizSettingDescriptors } from "$/models/vizs/VizSettingDescriptors.types.ts";

const CURVE_TYPE_OPTIONS = [
  { value: "monotone", label: "Smooth" },
  { value: "linear", label: "Straight" },
  { value: "natural", label: "Natural" },
  { value: "step", label: "Step" },
] as const;

const descriptors: VizSettingDescriptors<AvaLineChartVizConfig, AvaLineSeries> =
  {
    chart: [
      {
        key: "withLegend",
        label: "Show legend",
        group: "Legend",
        control: { kind: "switch" },
      },
      makeLegendPositionDescriptor<AvaLineChartVizConfig>(),
      ...makeAxisDescriptors<AvaLineChartVizConfig>({
        axis: "xAxis",
        role: "category",
        rotation: true,
      }),
      ...makeAxisDescriptors<AvaLineChartVizConfig>({
        axis: "yAxis",
        role: "value",
      }),
      ...makeGridDescriptors<AvaLineChartVizConfig>(),
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

export const AvaLineChartVizConfigs = {
  vizType: "line",
  displayName: "Line Chart",
  descriptors,

  makeEmptyConfig: (): AvaLineChartVizConfig => {
    return {
      vizType: "line",
      xAxisKey: undefined,
      series: [],
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: AvaLineChartVizConfig,
    query: PartialStructuredQuery,
  ): AvaLineChartVizConfig => {
    return hydrateXYSeriesFromQuery(vizConfig, query, "line");
  },

  hydrateFromQueryResult: (
    vizConfig: AvaLineChartVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaLineChartVizConfig => {
    return hydrateXYSeriesFromQueryResult(vizConfig, columns, "line");
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaLineChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const { xAxisKey, series, withLegend, chartStyle } = vizConfig;
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
          layout: "group",
          withLegend,
          chartStyle,
        };
      })
      .with("line", (): AvaLineChartVizConfig => {
        return vizConfig;
      })
      .with("area", (vizType): AvaAreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: series.map((s) => {
            return convertSeriesRenderAs(s, "area");
          }) as AvaXYSeries[],
          layout: "default",
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
} as const satisfies IAvaVizConfigModule<"line">;
