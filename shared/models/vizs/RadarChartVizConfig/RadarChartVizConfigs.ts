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
import type { VizSettingDescriptors } from "$/models/vizs/SettingDescriptor.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  VizConfigType,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";

import { match } from "ts-pattern";

import { hydrateRadarSeriesFromQuery } from "$/models/vizs/hydrateRadarSeriesFromQuery.ts";
import { hydrateRadarSeriesFromQueryResult } from "$/models/vizs/hydrateRadarSeriesFromQueryResult.ts";

const LEGEND_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

const descriptors: VizSettingDescriptors<RadarChartVizConfig, RadarSeries> = {
  chart: [
    {
      key: "withLegend",
      label: "Show legend",
      group: "Legend",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.legend.position",
      label: "Legend position",
      group: "Legend",
      control: { kind: "segmented", options: LEGEND_POSITION_OPTIONS },
    },
  ],
  series: [
    {
      key: "color",
      appliesTo: "radar",
      composable: true,
      label: "Color",
      group: "Style",
      control: { kind: "color" },
    },
    {
      key: "label",
      appliesTo: "radar",
      composable: true,
      label: "Series label",
      group: "Identity",
      control: { kind: "text", placeholder: "Defaults to column name" },
    },
    {
      key: "strokeWidth",
      appliesTo: "radar",
      composable: true,
      label: "Stroke width",
      group: "Style",
      control: { kind: "number", min: 0, max: 8, step: 1, unit: "px" },
    },
    {
      key: "fillOpacity",
      appliesTo: "radar",
      composable: true,
      label: "Fill opacity",
      group: "Style",
      control: { kind: "number", min: 0, max: 1, step: 0.05 },
    },
  ],
};

export const RadarChartVizConfigs = {
  vizType: "radar",
  displayName: "Radar Chart",
  descriptors,

  makeEmptyConfig: (): RadarChartVizConfig => {
    return {
      vizType: "radar",
      nameKey: undefined,
      series: [],
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: RadarChartVizConfig,
    query: PartialStructuredQuery,
  ): RadarChartVizConfig => {
    return hydrateRadarSeriesFromQuery(vizConfig, query);
  },

  hydrateFromQueryResult: (
    vizConfig: RadarChartVizConfig,
    columns: readonly QueryResultColumn[],
  ): RadarChartVizConfig => {
    return hydrateRadarSeriesFromQueryResult(vizConfig, columns);
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: RadarChartVizConfig,
    newVizType: K,
  ): VizConfigType<K> => {
    const { nameKey, series, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const xyFromFirst = (renderAs: "bar" | "line" | "area"): XYSeries[] => {
      if (firstSeries === undefined) {
        return [];
      }
      const common = {
        key: firstSeries.key,
        color: firstSeries.color,
        label: firstSeries.label,
      };
      if (renderAs === "area") {
        return [{ renderAs, ...common, fillOpacity: 0.6 }];
      }
      return [{ renderAs, ...common }];
    };
    const pieAxes = { nameKey, valueKey: firstSeries?.key };
    return match<VizType>(newVizType)
      .with("table", (vizType): TableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xyFromFirst("bar"),
          layout: "group",
          withLegend: withLegend ?? true,
          chartStyle,
        };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xyFromFirst("line"),
          withLegend: withLegend ?? true,
          chartStyle,
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xyFromFirst("area"),
          layout: "default",
          withLegend: withLegend ?? true,
          chartStyle,
        };
      })
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        const scatterSeries =
          nameKey !== undefined && firstSeries !== undefined
            ? [{ xKey: nameKey, key: firstSeries.key }]
            : [];
        return { vizType, series: scatterSeries, chartStyle };
      })
      .with("pie", (vizType): PieChartVizConfig => {
        return {
          vizType,
          ...pieAxes,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): FunnelChartVizConfig => {
        return { vizType, ...pieAxes };
      })
      .with("radar", (): RadarChartVizConfig => {
        return vizConfig;
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        const bubbleSeries =
          nameKey !== undefined && firstSeries !== undefined
            ? [
                {
                  xKey: nameKey,
                  key: firstSeries.key,
                  sizeKey: firstSeries.key,
                },
              ]
            : [];
        return { vizType, series: bubbleSeries, chartStyle };
      })
      .exhaustive(() => {
        throw new Error(`Invalid viz type: ${newVizType}`);
      }) as VizConfigType<K>;
  },
} as const satisfies IVizConfigModule<"radar">;
