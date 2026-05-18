import { hydratePieFromQuery } from "$/models/vizs/hydratePieFromQuery.ts";
import { hydratePieFromQueryResult } from "$/models/vizs/hydratePieFromQueryResult.ts";
import { EMPTY_VIZ_SETTING_DESCRIPTORS } from "$/models/vizs/SettingDescriptor.ts";
import { match } from "ts-pattern";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types.ts";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types.ts";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { RadarSeries, XYSeries } from "$/models/vizs/SeriesConfig.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

export const FunnelChartVizConfigs = {
  vizType: "funnel",
  displayName: "Funnel Chart",
  descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS,

  makeEmptyConfig: (): FunnelChartVizConfig => {
    return { vizType: "funnel", nameKey: undefined, valueKey: undefined };
  },

  hydrateFromQuery: (
    vizConfig: FunnelChartVizConfig,
    query: PartialStructuredQuery,
  ): FunnelChartVizConfig => {
    return hydratePieFromQuery(vizConfig, query);
  },

  hydrateFromQueryResult: (
    vizConfig: FunnelChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): FunnelChartVizConfig => {
    return hydratePieFromQueryResult(vizConfig, columns);
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: FunnelChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { nameKey, valueKey, seriesColors } = vizConfig;
    const seriesColor: string | undefined =
      valueKey !== undefined ? seriesColors?.[valueKey] : undefined;
    const xySeries = (renderAs: "bar" | "line" | "area"): XYSeries[] => {
      if (valueKey === undefined) {
        return [];
      }
      if (renderAs === "area") {
        return [
          { renderAs, key: valueKey, color: seriesColor, fillOpacity: 0.6 },
        ];
      }
      return [{ renderAs, key: valueKey, color: seriesColor }];
    };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xySeries("bar"),
          layout: "group",
          withLegend: true,
        };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xySeries("line"),
          withLegend: true,
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xySeries("area"),
          layout: "default",
          withLegend: true,
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, xAxisKey: nameKey, yAxisKey: valueKey };
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          nameKey,
          valueKey,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (): FunnelChartVizConfig => {
        return vizConfig;
      })
      .with("radar", (vizType): RadarChartVizConfig => {
        const radarSeries: RadarSeries[] =
          valueKey === undefined ? [] : [{ key: valueKey, color: seriesColor }];
        return { vizType, nameKey, series: radarSeries, withLegend: true };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          yAxisKey: valueKey,
          sizeKey: undefined,
        };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"funnel">;
