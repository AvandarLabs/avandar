import { match } from "ts-pattern";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
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

export const TableVizConfigs = {
  vizType: "table",
  displayName: "Table",

  /** Create an empty table config */
  makeEmptyConfig: (): TableVizConfig => {
    return { vizType: "table" };
  },

  /**
   * Hydrate a table viz config from a query config.
   */
  hydrateFromQuery: (vizConfig: TableVizConfig): TableVizConfig => {
    return vizConfig;
  },

  /**
   * Table viz has no axis keys to hydrate from query results.
   */
  hydrateFromQueryResult: (
    vizConfig: TableVizConfig,
    _columns: readonly QueryResultColumn[],
  ): TableVizConfig => {
    return vizConfig;
  },

  /**
   * Convert a table config to a new type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: TableVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const emptyXY = { xAxisKey: undefined, yAxisKey: undefined };
    const emptyPie = { nameKey: undefined, valueKey: undefined };
    return match<VizType>(newVizType)
      .with("table", (): TableVizConfig => {
        return vizConfig;
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...emptyXY, withLegend: true };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          ...emptyXY,
          withLegend: true,
          curveType: "monotone",
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          ...emptyXY,
          withLegend: true,
          curveType: "monotone",
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, ...emptyXY };
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          ...emptyPie,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): FunnelChartVizConfig => {
        return { vizType, ...emptyPie };
      })
      .with("radar", (vizType): RadarChartVizConfig => {
        return { vizType, ...emptyPie };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        return { vizType, ...emptyXY, sizeKey: undefined };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"table">;
