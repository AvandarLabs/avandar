import { match } from "ts-pattern";
import { hydrateXYFromQuery } from "$/models/vizs/hydrateXYFromQuery.ts";
import { hydrateXYFromQueryResult } from "$/models/vizs/hydrateXYFromQueryResult.ts";
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

export const LineChartVizConfigs = {
  vizType: "line",
  displayName: "Line Chart",

  /** Create an empty line chart config */
  makeEmptyConfig: (): LineChartVizConfig => {
    return {
      vizType: "line",
      xAxisKey: undefined,
      yAxisKey: undefined,
      withLegend: true,
      curveType: "monotone",
    };
  },

  /**
   * Hydrate a line chart viz config from a query config.
   */
  hydrateFromQuery: (
    vizConfig: LineChartVizConfig,
    query: PartialStructuredQuery,
  ): LineChartVizConfig => {
    return hydrateXYFromQuery(vizConfig, query);
  },

  /**
   * Hydrate axis keys from query result columns when they are undefined.
   */
  hydrateFromQueryResult: (
    vizConfig: LineChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): LineChartVizConfig => {
    return hydrateXYFromQueryResult(vizConfig, columns, "line");
  },

  /**
   * Convert a line chart config to a new type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: LineChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { xAxisKey, yAxisKey, withLegend, curveType } = vizConfig;
    const xyAxes = { xAxisKey, yAxisKey };
    const pieAxes = { nameKey: xAxisKey, valueKey: yAxisKey };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...xyAxes, withLegend };
      })
      .with("line", (): LineChartVizConfig => {
        return vizConfig;
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return { vizType, ...xyAxes, withLegend, curveType };
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
} as const satisfies IVizConfigModule<"line">;
