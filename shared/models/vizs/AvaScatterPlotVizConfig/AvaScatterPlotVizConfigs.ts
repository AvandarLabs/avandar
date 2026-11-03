import { match } from "ts-pattern";
import { hydrateScatterSeriesFromQuery } from "$/models/vizs/hydrations/hydrateScatterSeriesFromQuery.ts";
import { hydrateScatterSeriesFromQueryResult } from "$/models/vizs/hydrations/hydrateScatterSeriesFromQueryResult/hydrateScatterSeriesFromQueryResult.ts";
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { makeGridDescriptors } from "$/models/vizs/makeGridDescriptors/makeGridDescriptors.ts";
import { makeLegendPositionDescriptor } from "$/models/vizs/makeLegendPositionDescriptor/makeLegendPositionDescriptor.ts";
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
    makeLegendPositionDescriptor<AvaScatterPlotVizConfig>(),
    ...makeAxisDescriptors<AvaScatterPlotVizConfig>({
      axis: "xAxis",
      role: "value",
      rotation: true,
    }),
    ...makeAxisDescriptors<AvaScatterPlotVizConfig>({
      axis: "yAxis",
      role: "value",
    }),
    ...makeGridDescriptors<AvaScatterPlotVizConfig>(),
  ],
  series: [],
} as const satisfies VizSettingDescriptors<
  AvaScatterPlotVizConfig,
  AvaScatterSeries
>;

export const AvaScatterPlotVizConfigs = {
  vizType: "scatter",
  displayName: "Scatter Plot",
  descriptors: DESCRIPTORS,

  /** Create an empty scatter plot config. */
  makeEmptyConfig: (): AvaScatterPlotVizConfig => {
    return { vizType: "scatter", series: [] };
  },

  /**
   * Gives a scatter config with no series one series on the structured
   * query's first two numeric columns, for X and Y, reusing the column when
   * there is only one. Existing series are kept as they are.
   */
  hydrateFromQuery: (
    vizConfig: AvaScatterPlotVizConfig,
    query: PartialStructuredQuery,
  ): AvaScatterPlotVizConfig => {
    return hydrateScatterSeriesFromQuery(vizConfig, query);
  },

  /**
   * Gives a scatter config with no series one series on the result's first
   * two numeric columns, for X and Y, reusing the column when there is only
   * one. Existing series are kept, even ones whose columns the result does
   * not have.
   */
  hydrateFromQueryResult: (
    vizConfig: AvaScatterPlotVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaScatterPlotVizConfig => {
    return hydrateScatterSeriesFromQueryResult(vizConfig, columns);
  },

  /**
   * Convert a scatter config to any other viz type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaScatterPlotVizConfig,
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
      .with("scatter", (): AvaScatterPlotVizConfig => {
        return vizConfig;
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
      .with("bubble", (vizType): AvaBubbleChartVizConfig => {
        const bubbleSeries: AvaBubbleSeries[] = vizConfig.series.map((s) => {
          return {
            xKey: s.xKey,
            key: s.key,
            sizeKey: s.key,
            label: s.label,
            color: s.color,
          };
        });
        return { vizType, series: bubbleSeries, chartStyle };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as AvaVizConfigType<K>;
  },
} as const satisfies IAvaVizConfigModule<"scatter">;
