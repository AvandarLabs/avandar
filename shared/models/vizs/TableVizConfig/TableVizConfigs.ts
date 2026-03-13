import { match } from "ts-pattern";
import type { BarChartVizConfig } from "../BarChartVizConfig/BarChartVizConfig.types.ts";
import type { LineChartVizConfig } from "../LineChartVizConfig/LineChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "../ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { IVizConfigModule } from "../VizConfig/IVizConfigModule.ts";
import type { VizConfigType, VizType } from "../VizConfig/VizConfig.types.ts";
import type { TableVizConfig } from "./TableVizConfig.types.ts";

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
