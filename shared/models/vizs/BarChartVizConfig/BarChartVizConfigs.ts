import { hydrateXYFromQuery } from "$/models/vizs/hydrateXYFromQuery.ts";
import { hydrateXYFromQueryResult } from "$/models/vizs/hydrateXYFromQueryResult.ts";
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
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

export const BarChartVizConfigs = {
  vizType: "bar",
  displayName: "Bar Chart",

  /** Create an empty bar config */
  makeEmptyConfig: (): BarChartVizConfig => {
    return {
      vizType: "bar",
      xAxisKey: undefined,
      yAxisKey: undefined,
      withLegend: true,
    };
  },

  /**
   * Hydrate a bar chart viz config from a query config.
   */
  hydrateFromQuery: (
    vizConfig: BarChartVizConfig,
    query: PartialStructuredQuery,
  ): BarChartVizConfig => {
    return hydrateXYFromQuery(vizConfig, query);
  },

  /**
   * Hydrate axis keys from query result columns when they are undefined.
   */
  hydrateFromQueryResult: (
    vizConfig: BarChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): BarChartVizConfig => {
    return hydrateXYFromQueryResult(vizConfig, columns, "bar");
  },

  /**
   * Convert a bar chart config to a new type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: BarChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { xAxisKey, yAxisKey, withLegend } = vizConfig;
    const xyAxes = { xAxisKey, yAxisKey };
    const pieAxes = { nameKey: xAxisKey, valueKey: yAxisKey };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (): BarChartVizConfig => {
        return vizConfig;
      })
      .with("line", (vizType): LineChartVizConfig => {
        return { vizType, ...xyAxes, withLegend, curveType: "monotone" };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return { vizType, ...xyAxes, withLegend, curveType: "monotone" };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, ...xyAxes };
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
        return { vizType, ...pieAxes };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        return { vizType, ...xyAxes, sizeKey: undefined };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"bar">;
