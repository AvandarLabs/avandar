import { match } from "ts-pattern";
import { makeAxisDescriptors } from "$/models/vizs/descriptors/makeAxisDescriptors/makeAxisDescriptors.ts";
import { makeGridDescriptors } from "$/models/vizs/descriptors/makeGridDescriptors.ts";
import { makeLegendPositionDescriptor } from "$/models/vizs/descriptors/makeLegendPositionDescriptor.ts";
import { hydrateBubbleSeriesFromQuery } from "$/models/vizs/hydrations/fromQuery/hydrateBubbleSeriesFromQuery.ts";
import { hydrateBubbleSeriesFromQueryResult } from "$/models/vizs/hydrations/fromQueryResult/hydrateBubbleSeriesFromQueryResult/hydrateBubbleSeriesFromQueryResult.ts";
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
  AvaBubbleSeries,
  AvaRadarSeries,
  AvaScatterSeries,
  AvaXYSeries,
} from "$/models/vizs/series.types.ts";
import type { VizSettingDescriptors } from "$/models/vizs/VizSettingDescriptors.types.ts";

const DESCRIPTORS = {
  chart: [
    makeLegendPositionDescriptor<AvaBubbleChartVizConfig>(),
    ...makeAxisDescriptors<AvaBubbleChartVizConfig>({
      axis: "xAxis",
      role: "value",
      rotation: true,
    }),
    ...makeAxisDescriptors<AvaBubbleChartVizConfig>({
      axis: "yAxis",
      role: "value",
    }),
    ...makeGridDescriptors<AvaBubbleChartVizConfig>(),
  ],
  series: [],
} as const satisfies VizSettingDescriptors<
  AvaBubbleChartVizConfig,
  AvaBubbleSeries
>;

export const AvaBubbleChartVizConfigs = {
  vizType: "bubble",
  displayName: "Bubble Chart",
  descriptors: DESCRIPTORS,

  /** Create an empty bubble chart config. */
  makeEmptyConfig: (): AvaBubbleChartVizConfig => {
    return { vizType: "bubble", series: [] };
  },

  /**
   * Gives a bubble config with no series one series on the structured
   * query's first three numeric columns, for X, Y, and size, reusing a
   * column when there are fewer. Existing series are kept as they are.
   */
  hydrateFromQuery: (
    vizConfig: AvaBubbleChartVizConfig,
    query: PartialStructuredQuery,
  ): AvaBubbleChartVizConfig => {
    return hydrateBubbleSeriesFromQuery(vizConfig, query);
  },

  /**
   * Gives a bubble config with no series one series on the result's first
   * three numeric columns, for X, Y, and size, reusing a column when there
   * are fewer. Existing series are kept, even ones whose columns the result
   * does not have.
   */
  hydrateFromQueryResult: (
    vizConfig: AvaBubbleChartVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaBubbleChartVizConfig => {
    return hydrateBubbleSeriesFromQueryResult(vizConfig, columns);
  },

  /**
   * Convert a bubble config to any other viz type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaBubbleChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const firstSeries = vizConfig.series[0];
    const xAxisKey = firstSeries?.xKey;
    const yAxisKey = firstSeries?.key;
    const { chartStyle } = vizConfig;

    const xySeries = (renderAs: "bar" | "line" | "area"): AvaXYSeries[] => {
      if (yAxisKey === undefined) {
        return [];
      }
      if (renderAs === "area") {
        return [{ renderAs, key: yAxisKey, fillOpacity: 0.6 }];
      }
      return [{ renderAs, key: yAxisKey }];
    };

    return match<VizType>(newVizType)
      .with("table", (vizType): AvaTableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): AvaBarChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("bar"),
          layout: "group",
          withLegend: true,
          chartStyle,
        };
      })
      .with("line", (vizType): AvaLineChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("line"),
          withLegend: true,
          chartStyle,
        };
      })
      .with("area", (vizType): AvaAreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("area"),
          layout: "default",
          withLegend: true,
          chartStyle,
        };
      })
      .with("scatter", (vizType): AvaScatterPlotVizConfig => {
        // Drop sizeKey; keep xKey and key
        const scatterSeries: AvaScatterSeries[] = vizConfig.series.map((s) => {
          return { xKey: s.xKey, key: s.key, label: s.label, color: s.color };
        });
        return { vizType, series: scatterSeries, chartStyle };
      })
      .with("pie", (vizType): AvaPieChartVizConfig => {
        return {
          vizType,
          nameKey: xAxisKey,
          valueKey: yAxisKey,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): AvaFunnelChartVizConfig => {
        return { vizType, nameKey: xAxisKey, valueKey: yAxisKey };
      })
      .with("radar", (vizType): AvaRadarChartVizConfig => {
        const radarSeries: AvaRadarSeries[] =
          yAxisKey === undefined ? [] : [{ key: yAxisKey }];
        return {
          vizType,
          nameKey: xAxisKey,
          series: radarSeries,
          withLegend: true,
          chartStyle,
        };
      })
      .with("bubble", (): AvaBubbleChartVizConfig => {
        return vizConfig;
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as AvaVizConfigType<K>;
  },
} as const satisfies IAvaVizConfigModule<"bubble">;
