import { Logger } from "$/lib/Logger/Logger";
import { match } from "ts-pattern";
import { pick } from "@/lib/utils/objects/misc";
import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";
import { BarChartVizConfig } from "../BarChartVizConfig";
import { hydrateXYFromQuery } from "../hydrateXYFromQuery";
import { ScatterPlotVizConfig } from "../ScatterPlotVizConfig";
import { TableVizConfig } from "../TableVizConfig";
import { VizConfigType, VizType } from "../VizConfig";
import { IVizConfigModule } from "../VizConfig/IVizConfigModule";
import { LineChartVizConfig } from "./LineChartVizConfig.types";

export const LineChartVizConfigs = {
  vizType: "line",
  displayName: "Line Chart",

  /** Create an empty line chart config */
  makeEmptyConfig: (): LineChartVizConfig => {
    return { vizType: "line", xAxisKey: undefined, yAxisKey: undefined };
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
   * Convert a line chart config to a new type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: LineChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const currentAxes = pick(vizConfig, ["xAxisKey", "yAxisKey"]);
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...currentAxes };
      })
      .with("line", (): LineChartVizConfig => {
        return vizConfig;
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, ...currentAxes };
      })
      .exhaustive(() => {
        Logger.error("Invalid viz type", { vizType: newVizType });
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"line">;
