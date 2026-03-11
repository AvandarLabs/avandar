import { pick } from "@utils/objects/pick/pick.ts";
import { match } from "ts-pattern";
import { hydrateXYFromQuery } from "../hydrateXYFromQuery.ts";
import type { BarChartVizConfig } from "../BarChartVizConfig/BarChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "../ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { TableVizConfig } from "../TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "../VizConfig/IVizConfigModule.ts";
import type { VizConfigType, VizType } from "../VizConfig/VizConfig.types.ts";
import type { LineChartVizConfig } from "./LineChartVizConfig.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

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
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"line">;
