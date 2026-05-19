import { EMPTY_VIZ_SETTING_DESCRIPTORS } from "$/models/vizs/SettingDescriptor.ts";
import { match } from "ts-pattern";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types.ts";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types.ts";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

export const TableVizConfigs = {
  vizType: "table",
  displayName: "Table",
  descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS,

  makeEmptyConfig: (): TableVizConfig => {
    return { vizType: "table" };
  },

  hydrateFromQuery: (vizConfig: TableVizConfig): TableVizConfig => {
    return vizConfig;
  },

  hydrateFromQueryResult: (
    vizConfig: TableVizConfig,
    _columns: readonly QueryResultColumn[],
  ): TableVizConfig => {
    return vizConfig;
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: TableVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    return match<VizType>(newVizType)
      .with("table", (): TableVizConfig => {
        return vizConfig;
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          series: [],
          layout: "group",
          withLegend: true,
        };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          series: [],
          withLegend: true,
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          series: [],
          layout: "default",
          withLegend: true,
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, xAxisKey: undefined, yAxisKey: undefined };
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          nameKey: undefined,
          valueKey: undefined,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): FunnelChartVizConfig => {
        return { vizType, nameKey: undefined, valueKey: undefined };
      })
      .with("radar", (vizType): RadarChartVizConfig => {
        return {
          vizType,
          nameKey: undefined,
          series: [],
          withLegend: true,
        };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        return {
          vizType,
          xAxisKey: undefined,
          yAxisKey: undefined,
          sizeKey: undefined,
        };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"table">;
