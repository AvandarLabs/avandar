import { match } from "ts-pattern";
import { makeLegendPositionDescriptor } from "$/models/vizs/descriptors/makeLegendPositionDescriptor.ts";
import { hydrateRadarSeriesFromQuery } from "$/models/vizs/hydrations/fromQuery/hydrateRadarSeriesFromQuery.ts";
import { hydrateRadarSeriesFromQueryResult } from "$/models/vizs/hydrations/fromQueryResult/hydrateRadarSeriesFromQueryResult.ts";
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
import type { VizSettingDescriptors } from "$/models/vizs/VizSettingDescriptors.types.ts";

const descriptors: VizSettingDescriptors<
  AvaRadarChartVizConfig,
  AvaRadarSeries
> = {
  chart: [
    {
      key: "withLegend",
      label: "Show legend",
      group: "Legend",
      control: { kind: "switch" },
    },
    makeLegendPositionDescriptor<AvaRadarChartVizConfig>(),
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

export const AvaRadarChartVizConfigs = {
  vizType: "radar",
  displayName: "Radar Chart",
  descriptors,

  makeEmptyConfig: (): AvaRadarChartVizConfig => {
    return {
      vizType: "radar",
      nameKey: undefined,
      series: [],
      withLegend: true,
    };
  },

  hydrateFromQuery: (
    vizConfig: AvaRadarChartVizConfig,
    query: PartialStructuredQuery,
  ): AvaRadarChartVizConfig => {
    return hydrateRadarSeriesFromQuery(vizConfig, query);
  },

  hydrateFromQueryResult: (
    vizConfig: AvaRadarChartVizConfig,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaRadarChartVizConfig => {
    return hydrateRadarSeriesFromQueryResult(vizConfig, columns);
  },

  convertVizConfig: <K extends VizType = VizType>(
    vizConfig: AvaRadarChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const { nameKey, series, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const xyFromFirst = (renderAs: "bar" | "line" | "area"): AvaXYSeries[] => {
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
      .with("table", (vizType): AvaTableVizConfig => {
        return { vizType };
      })
      .with("bar", (vizType): AvaBarChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xyFromFirst("bar"),
          layout: "group",
          withLegend: withLegend ?? true,
          chartStyle,
        };
      })
      .with("line", (vizType): AvaLineChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xyFromFirst("line"),
          withLegend: withLegend ?? true,
          chartStyle,
        };
      })
      .with("area", (vizType): AvaAreaChartVizConfig => {
        return {
          vizType,
          xAxisKey: nameKey,
          series: xyFromFirst("area"),
          layout: "default",
          withLegend: withLegend ?? true,
          chartStyle,
        };
      })
      .with("scatter", (vizType): AvaScatterPlotVizConfig => {
        const scatterSeries =
          nameKey !== undefined && firstSeries !== undefined
            ? [{ xKey: nameKey, key: firstSeries.key }]
            : [];
        return { vizType, series: scatterSeries, chartStyle };
      })
      .with("pie", (vizType): AvaPieChartVizConfig => {
        return {
          vizType,
          ...pieAxes,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        };
      })
      .with("funnel", (vizType): AvaFunnelChartVizConfig => {
        return { vizType, ...pieAxes };
      })
      .with("radar", (): AvaRadarChartVizConfig => {
        return vizConfig;
      })
      .with("bubble", (vizType): AvaBubbleChartVizConfig => {
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
      }) as AvaVizConfigType<K>;
  },
} as const satisfies IAvaVizConfigModule<"radar">;
