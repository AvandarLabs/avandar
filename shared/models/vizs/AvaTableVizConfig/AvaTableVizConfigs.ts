import { match } from "ts-pattern";
import { EMPTY_VIZ_SETTING_DESCRIPTORS } from "$/models/vizs/SettingDescriptor.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { AvaAreaChartVizConfig } from "$/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfig.types.ts";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts";
import type { AvaBubbleChartVizConfig } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfig.types.ts";
import type { AvaFunnelChartVizConfig } from "$/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfig.types.ts";
import type { AvaLineChartVizConfig } from "$/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfig.types.ts";
import type { AvaPieChartVizConfig } from "$/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfig.types.ts";
import type { AvaRadarChartVizConfig } from "$/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfig.types.ts";
import type { AvaScatterPlotVizConfig } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfig.types.ts";
import type { AvaTableVizConfig } from "$/models/vizs/AvaTableVizConfig/AvaTableVizConfig.types.ts";
import type {
  AvaVizConfigType,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";
import type { IAvaVizConfigModule } from "$/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts";

export const AvaTableVizConfigs = {
  vizType: "table",
  displayName: "Table",
  descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS,

  makeEmptyConfig: (): AvaTableVizConfig => {
    return { vizType: "table" };
  },

  hydrateFromQuery: (vizConfig: AvaTableVizConfig): AvaTableVizConfig => {
    return vizConfig;
  },

  hydrateFromQueryResult: (
    vizConfig: AvaTableVizConfig,
    _columns: readonly QueryResult.ColumnWithId[],
  ): AvaTableVizConfig => {
    return vizConfig;
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaTableVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    return match<VizType>(newVizType)
      .with("table", (): AvaTableVizConfig => {
        return vizConfig;
      })
      .with("bar", (vizType): AvaBarChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          series: [],
          layout: "group",
          withLegend: true,
        };
      })
      .with("line", (vizType): AvaLineChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          series: [],
          withLegend: true,
        };
      })
      .with("area", (vizType): AvaAreaChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          series: [],
          layout: "default",
          withLegend: true,
        };
      })
      .with("scatter", (vizType): AvaScatterPlotVizConfig => {
        return { vizType, series: [] };
      })
      .with("pie", (vizType): AvaPieChartVizConfig => {
        return {
          vizType,
          nameKey: undefined,
          valueKey: undefined,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): AvaFunnelChartVizConfig => {
        return { vizType, nameKey: undefined, valueKey: undefined };
      })
      .with("radar", (vizType): AvaRadarChartVizConfig => {
        return {
          vizType,
          nameKey: undefined,
          series: [],
          withLegend: true,
        };
      })
      .with("bubble", (vizType): AvaBubbleChartVizConfig => {
        return { vizType, series: [] };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as AvaVizConfigType<K>;
  },
} as const satisfies IAvaVizConfigModule<"table">;
