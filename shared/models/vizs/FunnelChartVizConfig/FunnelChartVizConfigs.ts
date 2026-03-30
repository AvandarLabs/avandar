import { match } from "ts-pattern";
import { hydratePieFromQuery } from "$/models/vizs/hydratePieFromQuery.ts";
import {
  hydratePieFromQueryResult,
} from "$/models/vizs/hydratePieFromQueryResult.ts";
import type {
  AreaChartVizConfig,
} from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts";
import type {
  BarChartVizConfig,
} from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type {
  BubbleChartVizConfig,
} from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts";
import type {
  FunnelChartVizConfig,
} from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types.ts";
import type {
  LineChartVizConfig,
} from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type {
  PieChartVizConfig,
} from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types.ts";
import type {
  RadarChartVizConfig,
} from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types.ts";
import type {
  ScatterPlotVizConfig,
} from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type {
  TableVizConfig,
} from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type {
  IVizConfigModule,
} from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";
import type {
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type {
  QueryResultColumn,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

export const FunnelChartVizConfigs = {
  vizType: "funnel",
  displayName: "Funnel Chart",

  /** Create an empty funnel chart config. */
  makeEmptyConfig: (): FunnelChartVizConfig => {
    return { vizType: "funnel", nameKey: undefined, valueKey: undefined };
  },

  /**
   * Hydrate a funnel chart viz config from a query config.
   */
  hydrateFromQuery: (
    vizConfig: FunnelChartVizConfig,
    query: PartialStructuredQuery,
  ): FunnelChartVizConfig => {
    return hydratePieFromQuery(vizConfig, query);
  },

  /**
   * Hydrate `nameKey` and `valueKey` from query result column metadata.
   */
  hydrateFromQueryResult: (
    vizConfig: FunnelChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): FunnelChartVizConfig => {
    return hydratePieFromQueryResult(vizConfig, columns);
  },

  /**
   * Convert a funnel chart config to a new viz type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: FunnelChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { nameKey, valueKey } = vizConfig;
    const xyAxes = { xAxisKey: nameKey, yAxisKey: valueKey };
    const pieAxes = { nameKey, valueKey };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...xyAxes, withLegend: true };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          ...xyAxes,
          withLegend: true,
          curveType: "monotone",
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          ...xyAxes,
          withLegend: true,
          curveType: "monotone",
        };
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
      .with("funnel", (): FunnelChartVizConfig => {
        return vizConfig;
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
} as const satisfies IVizConfigModule<"funnel">;
