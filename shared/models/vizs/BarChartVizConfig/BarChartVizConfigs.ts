import { pick } from "@utils/objects/pick/pick.ts";
import { hydrateXYFromQuery } from "$/models/vizs/hydrateXYFromQuery.ts";
import { match } from "ts-pattern";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

export const BarChartVizConfigs = {
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
      })
      .with("bar", (): BarChartVizConfig => {
        return vizConfig;
      })
      .with("line", (vizType): LineChartVizConfig => {
        return { vizType, ...currentAxes };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, ...currentAxes };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"bar">;
