import { Logger } from "$/lib/Logger/Logger";
import { match } from "ts-pattern";
import { TableVizConfig } from ".";
import { BarChartVizConfig } from "../BarChartVizConfig";
import { LineChartVizConfig } from "../LineChartVizConfig";
import { ScatterPlotVizConfig } from "../ScatterPlotVizConfig";
import { VizConfigType, VizType } from "../VizConfig";
import { IVizConfigModule } from "../VizConfig/IVizConfigModule";

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
        Logger.error("Invalid viz type", { vizType: newVizType });
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"table">;
