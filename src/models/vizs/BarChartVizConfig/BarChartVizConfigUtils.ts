import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";
import { VizConfigType, VizType } from "../VizConfig";
import { IVizConfigModule } from "../VizConfig/IVizConfigModule";
import { BarChartVizConfig } from "./BarChartVizConfig.types";
import { match } from "ts-pattern";
import { TableVizConfig } from "../TableVizConfig";
import { LineChartVizConfig } from "../LineChartVizConfig";
import { ScatterPlotVizConfig } from "../ScatterPlotVizConfig";
import { pick } from "@/lib/utils/objects/misc";
import { Logger } from "@/lib/Logger";
import { hydrateXYFromQuery } from "../hydrateXYFromQuery";

export const BarChartVizConfigUtils = {
  vizType: "bar",
  displayName: "Bar Chart",

  /** Create an empty bar config */
  makeEmptyConfig: (): BarChartVizConfig => {
    return {
      vizType: "bar",
      xAxisKey: undefined,
      yAxisKey: undefined,
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
   * Convert a bar chart config to a new type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: BarChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const currentAxes = pick(vizConfig, ["xAxisKey", "yAxisKey"]);
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      }).with("bar", (): BarChartVizConfig => {
        return vizConfig;
      }).with("line", (vizType): LineChartVizConfig => {
        return { vizType, ...currentAxes };
      }).with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, ...currentAxes };
      }).exhaustive(() => {
        Logger.error("Invalid viz type", { vizType: newVizType });
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"bar">;
