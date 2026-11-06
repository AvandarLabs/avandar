import { match } from "ts-pattern";
import { hydratePieFromQuery } from "$/models/vizs/hydrations/fromQuery/hydratePieFromQuery/hydratePieFromQuery.ts";
import { hydratePieFromQueryResult } from "$/models/vizs/hydrations/fromQueryResult/hydratePieFromQueryResult/hydratePieFromQueryResult.ts";
import { EMPTY_VIZ_SETTING_DESCRIPTORS } from "$/models/vizs/VizSettingDescriptors.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
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
import type {
  AvaRadarSeries,
  AvaXYSeries,
} from "$/models/vizs/series.types.ts";

export const AvaFunnelChartVizConfigs = {
  vizType: "funnel",
  displayName: "Funnel Chart",
  descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS,

  makeEmptyConfig: (): AvaFunnelChartVizConfig => {
    return { vizType: "funnel", nameKey: undefined, valueKey: undefined };
  },

  hydrateFromQuery: (
    vizConfig: AvaFunnelChartVizConfig,
    query: PartialStructuredQuery,
  ): AvaFunnelChartVizConfig => {
    return hydratePieFromQuery(vizConfig, query);
  },

  hydrateFromQueryResult: (
    vizConfig: AvaFunnelChartVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaFunnelChartVizConfig => {
    return hydratePieFromQueryResult(vizConfig, columns);
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaFunnelChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const { nameKey, valueKey, seriesColors } = vizConfig;
    const seriesColor: string | undefined =
      valueKey !== undefined ? seriesColors?.[valueKey] : undefined;
    const xySeries = (renderAs: "bar" | "line" | "area"): AvaXYSeries[] => {
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
      .with("table", (vizType): AvaTableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): AvaBarChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xySeries("bar"),
          layout: "group",
          withLegend: true,
        };
      })
      .with("line", (vizType): AvaLineChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xySeries("line"),
          withLegend: true,
        };
      })
      .with("area", (vizType): AvaAreaChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xySeries("area"),
          layout: "default",
          withLegend: true,
        };
      })
      .with("scatter", (vizType): AvaScatterPlotVizConfig => {
        const scatterSeries =
          nameKey !== undefined && valueKey !== undefined
            ? [{ xKey: nameKey, key: valueKey }]
            : [];
        return { vizType, series: scatterSeries };
      })
      .with("pie", (vizType): AvaPieChartVizConfig => {
        return {
          vizType,
          nameKey,
          valueKey,
          seriesColors,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (): AvaFunnelChartVizConfig => {
        return vizConfig;
      })
      .with("radar", (vizType): AvaRadarChartVizConfig => {
        const radarSeries: AvaRadarSeries[] =
          valueKey === undefined ? [] : [{ key: valueKey, color: seriesColor }];
        return { vizType, nameKey, series: radarSeries, withLegend: true };
      })
      .with("bubble", (vizType): AvaBubbleChartVizConfig => {
        const bubbleSeries =
          nameKey !== undefined && valueKey !== undefined
            ? [{ xKey: nameKey, key: valueKey, sizeKey: valueKey }]
            : [];
        return { vizType, series: bubbleSeries };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as AvaVizConfigType<K>;
  },
} as const satisfies IAvaVizConfigModule<"funnel">;
