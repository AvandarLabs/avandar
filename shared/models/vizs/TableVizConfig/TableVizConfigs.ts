import { match } from "ts-pattern";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type { VizConfigType, VizType } from "$/models/vizs/VizConfig/VizConfig.types.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

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
    const emptyAxes = { xAxisKey: undefined, yAxisKey: undefined };
    return match<VizType>(newVizType)
      .with("table", (): TableVizConfig => {
        return vizConfig;
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...emptyAxes };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return { vizType, ...emptyAxes };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, ...emptyAxes };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"table">;
