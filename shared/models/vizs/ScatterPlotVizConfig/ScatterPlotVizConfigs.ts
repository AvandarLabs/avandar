import { pick } from "@avandar/utils";
import { match } from "ts-pattern";
import { hydrateXYFromQuery } from "../hydrateXYFromQuery.ts";
import type { BarChartVizConfig } from "../BarChartVizConfig/BarChartVizConfig.types.ts";
import type { LineChartVizConfig } from "../LineChartVizConfig/LineChartVizConfig.types.ts";
import type { TableVizConfig } from "../TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "../VizConfig/IVizConfigModule.ts";
import type { VizConfigType, VizType } from "../VizConfig/VizConfig.types.ts";
import type { ScatterPlotVizConfig } from "./ScatterPlotVizConfig.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

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
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return { vizType, ...currentAxes };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return { vizType, ...currentAxes };
      })
      .with("scatter", (): ScatterPlotVizConfig => {
        return vizConfig;
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"scatter">;
