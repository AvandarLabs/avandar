import { hydrateScatterSeriesFromQuery } from "$/models/vizs/hydrateScatterSeriesFromQuery.ts";
import { hydrateScatterSeriesFromQueryResult } from "$/models/vizs/hydrateScatterSeriesFromQueryResult/hydrateScatterSeriesFromQueryResult.ts";
import { EMPTY_VIZ_SETTING_DESCRIPTORS } from "$/models/vizs/SettingDescriptor.ts";
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
  BubbleSeries,
  RadarSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

export const ScatterPlotVizConfigs = {
  vizType: "scatter",
  displayName: "Scatter Plot",
  descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS,

  /** Create an empty scatter plot config. */
  makeEmptyConfig: (): ScatterPlotVizConfig => {
    return { vizType: "scatter", series: [] };
  },

  /**
   * Hydrate a scatter config from a structured query's column list.
   * Prunes series referencing missing columns; seeds from the first two
   * numeric columns when the series array is empty.
   */
  hydrateFromQuery: (
    vizConfig: ScatterPlotVizConfig,
    query: PartialStructuredQuery,
  ): ScatterPlotVizConfig => {
    return hydrateScatterSeriesFromQuery(vizConfig, query);
  },

  /**
   * Hydrate a scatter config from query result columns.
   * Prunes series referencing missing columns; seeds from the first two
   * numeric columns when the series array is empty.
   */
  hydrateFromQueryResult: (
    vizConfig: ScatterPlotVizConfig,
    columns: readonly QueryResultColumn[],
  ): ScatterPlotVizConfig => {
    return hydrateScatterSeriesFromQueryResult(vizConfig, columns);
  },

  /**
   * Convert a scatter config to any other viz type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: ScatterPlotVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const firstSeries = vizConfig.series[0];
    const xAxisKey = firstSeries?.xKey;
    const yAxisKey = firstSeries?.key;
    const { chartStyle } = vizConfig;

    const xySeries = (renderAs: "bar" | "line" | "area"): XYSeries[] => {
      if (yAxisKey === undefined) {
        return [];
      }
      if (renderAs === "area") {
        return [{ renderAs, key: yAxisKey, fillOpacity: 0.6 }];
      }
      return [{ renderAs, key: yAxisKey }];
    };

    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("bar"),
          layout: "group",
          withLegend: true,
          chartStyle,
        };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("line"),
          withLegend: true,
          chartStyle,
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("area"),
          layout: "default",
          withLegend: true,
          chartStyle,
        };
      })
      .with("scatter", (): ScatterPlotVizConfig => {
        return vizConfig;
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          nameKey: xAxisKey,
          valueKey: yAxisKey,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): FunnelChartVizConfig => {
        return { vizType, nameKey: xAxisKey, valueKey: yAxisKey };
      })
      .with("radar", (vizType): RadarChartVizConfig => {
        const radarSeries: RadarSeries[] =
          yAxisKey === undefined ? [] : [{ key: yAxisKey }];
        return {
          vizType,
          nameKey: xAxisKey,
          series: radarSeries,
          withLegend: true,
          chartStyle,
        };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        const bubbleSeries: BubbleSeries[] = vizConfig.series.map((s) => {
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
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"scatter">;
