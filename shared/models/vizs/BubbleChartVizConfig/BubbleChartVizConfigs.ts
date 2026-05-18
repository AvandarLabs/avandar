import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { hydrateXYFromQuery } from "$/models/vizs/hydrateXYFromQuery.ts";
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

export const BubbleChartVizConfigs = {
  vizType: "bubble",
  displayName: "Bubble Chart",
  descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS,

  /** Create an empty bubble chart config. */
  makeEmptyConfig: (): BubbleChartVizConfig => {
    return {
      vizType: "bubble",
      xAxisKey: undefined,
      yAxisKey: undefined,
      sizeKey: undefined,
    };
  },

  /**
   * Hydrate a bubble chart viz config from a query config. Delegates X/Y
   * hydration to the scatter heuristic; `sizeKey` is inferred from result
   * columns only.
   */
  hydrateFromQuery: (
    vizConfig: BubbleChartVizConfig,
    query: PartialStructuredQuery,
  ): BubbleChartVizConfig => {
    return hydrateXYFromQuery(vizConfig, query);
  },

  /**
   * Hydrate `xAxisKey`, `yAxisKey`, and `sizeKey` from query result columns.
   * X and Y use the scatter numeric heuristic; `sizeKey` is the third
   * available numeric column that is not X or Y.
   */
  hydrateFromQueryResult: (
    vizConfig: BubbleChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): BubbleChartVizConfig => {
    return _hydrateBubbleFromQueryResult(vizConfig, columns);
  },

  /**
   * Convert a bubble chart config to a new viz type.
   */
  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: BubbleChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { xAxisKey, yAxisKey } = vizConfig;
    const xySeries = (renderAs: "bar" | "line" | "area"): XYSeries[] => {
      if (yAxisKey === undefined) {
        return [];
      }
      if (renderAs === "area") {
        return [{ renderAs, key: yAxisKey, fillOpacity: 0.6 }];
      }
      return [{ renderAs, key: yAxisKey }];
    };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("bar"),
          layout: "group",
          withLegend: true,
        };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("line"),
          withLegend: true,
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("area"),
          layout: "default",
          withLegend: true,
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        return { vizType, xAxisKey, yAxisKey };
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          nameKey: xAxisKey,
          valueKey: yAxisKey,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): FunnelChartVizConfig => {
        return { vizType, nameKey: xAxisKey, valueKey: yAxisKey };
      })
      .with("radar", (vizType): RadarChartVizConfig => {
        const radarSeries: RadarSeries[] =
          yAxisKey === undefined ? [] : [{ key: yAxisKey }];
        return {
          vizType,
          nameKey: xAxisKey,
          series: radarSeries,
          withLegend: true,
        };
      })
      .with("bubble", (): BubbleChartVizConfig => {
        return vizConfig;
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"bubble">;

function _hydrateBubbleFromQueryResult(
  vizConfig: BubbleChartVizConfig,
  columns: readonly QueryResultColumn[],
): BubbleChartVizConfig {
  if (columns.length === 0) {
    return vizConfig;
  }

  const numericCols = columns.filter((c) => {
    return AvaDataType.isNumeric(c.dataType);
  });

  let next = { ...vizConfig };

  if (next.xAxisKey === undefined) {
    const xCol = numericCols[0];
    if (xCol !== undefined) {
      next = { ...next, xAxisKey: xCol.name };
    }
  }

  if (next.yAxisKey === undefined) {
    const yCol = numericCols.find((c) => {
      return c.name !== next.xAxisKey;
    });
    if (yCol !== undefined) {
      next = { ...next, yAxisKey: yCol.name };
    }
  }

  if (next.sizeKey === undefined) {
    const sizeCol = numericCols.find((c) => {
      return c.name !== next.xAxisKey && c.name !== next.yAxisKey;
    });
    if (sizeCol !== undefined) {
      next = { ...next, sizeKey: sizeCol.name };
    }
  }

  return next;
}
