import { hydrateBubbleSeriesFromQuery } from "$/models/vizs/hydrateBubbleSeriesFromQuery.ts";
import { hydrateBubbleSeriesFromQueryResult } from "$/models/vizs/hydrateBubbleSeriesFromQueryResult/hydrateBubbleSeriesFromQueryResult.ts";
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { makeGridDescriptors } from "$/models/vizs/makeGridDescriptors/makeGridDescriptors.ts";
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
  ScatterSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
import type { VizSettingDescriptors } from "$/models/vizs/SettingDescriptor.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

const DESCRIPTORS = {
  chart: [
    ...makeAxisDescriptors<BubbleChartVizConfig>({
      axis: "xAxis",
      role: "value",
      rotation: true,
    }),
    ...makeAxisDescriptors<BubbleChartVizConfig>({
      axis: "yAxis",
      role: "value",
    }),
    // Grid controls only. Legend controls are intentionally omitted for now:
    // - The "Show legend" toggle is deferred to AVA-322 — bubble has no
    //   `withLegend` field yet, and adding one needs a convertVizConfig sweep.
    // - Legend position is deferred until the side-legend margin bug is fixed:
    //   applyChartStyle sets legendProps align for Left/Right but reserves no
    //   margin, so those positions render broken on the XY/radar charts today.
    ...makeGridDescriptors<BubbleChartVizConfig>(),
  ],
  series: [],
} as const satisfies VizSettingDescriptors<BubbleChartVizConfig, BubbleSeries>;

export const BubbleChartVizConfigs = {
  vizType: "bubble",
  displayName: "Bubble Chart",
  descriptors: DESCRIPTORS,

  /** Create an empty bubble chart config. */
  makeEmptyConfig: (): BubbleChartVizConfig => {
    return { vizType: "bubble", series: [] };
  },

  /**
   * Hydrate a bubble config from a structured query's column list.
   * Prunes series referencing missing columns; seeds from the first three
   * numeric columns when the series array is empty.
   */
  hydrateFromQuery: (
    vizConfig: BubbleChartVizConfig,
    query: PartialStructuredQuery,
  ): BubbleChartVizConfig => {
    return hydrateBubbleSeriesFromQuery(vizConfig, query);
  },

  /**
   * Hydrate a bubble config from query result columns.
   * Prunes series referencing missing columns; seeds from the first three
   * numeric columns when the series array is empty.
   */
  hydrateFromQueryResult: (
    vizConfig: BubbleChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): BubbleChartVizConfig => {
    return hydrateBubbleSeriesFromQueryResult(vizConfig, columns);
  },

  /**
   * Convert a bubble config to any other viz type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: BubbleChartVizConfig,
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
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        // Drop sizeKey; keep xKey and key
        const scatterSeries: ScatterSeries[] = vizConfig.series.map((s) => {
          return { xKey: s.xKey, key: s.key, label: s.label, color: s.color };
        });
        return { vizType, series: scatterSeries, chartStyle };
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
      .with("bubble", (): BubbleChartVizConfig => {
        return vizConfig;
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"bubble">;
