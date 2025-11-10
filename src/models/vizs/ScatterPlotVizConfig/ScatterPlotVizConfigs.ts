import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";
import { VizConfigType, VizType } from "../VizConfig";
import { IVizConfigModule } from "../VizConfig/IVizConfigModule";
import { ScatterPlotVizConfig } from "./ScatterPlotVizConfig.types";
import { match } from "ts-pattern";
import { TableVizConfig } from "../TableVizConfig";
import { pick } from "@/lib/utils/objects/misc";
import { Logger } from "@/lib/Logger";
import { hydrateXYFromQuery } from "../hydrateXYFromQuery";
import { BarChartVizConfig } from "../BarChartVizConfig";
import { LineChartVizConfig } from "../LineChartVizConfig";

export const ScatterPlotVizConfigs = {
  vizType: "scatter",
  displayName: "Scatter Plot",

  /** Create an empty scatter plot config */
  makeEmptyConfig: (): ScatterPlotVizConfig => {
    return { vizType: "scatter", xAxisKey: undefined, yAxisKey: undefined };
  },

  /**
   * Hydrate a scatter plot viz config from a query config.
   */
  hydrateFromQuery: (
    vizConfig: ScatterPlotVizConfig,
    query: PartialStructuredQuery,
  ): ScatterPlotVizConfig => {
    return hydrateXYFromQuery(vizConfig, query);
  },

  /**
   * Convert a scatter plot config to a new type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: ScatterPlotVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const currentAxes = pick(vizConfig, ["xAxisKey", "yAxisKey"]);
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      }).with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...currentAxes };
      }).with("line", (vizType): LineChartVizConfig => {
        return { vizType, ...currentAxes };
      }).with("scatter", (): ScatterPlotVizConfig => {
        return vizConfig;
      }).exhaustive(() => {
        Logger.error("Invalid viz type", { vizType: newVizType });
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"scatter">;
