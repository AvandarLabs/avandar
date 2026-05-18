/**
 * This file contains the types for the AvaPageData v1 and v2.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this file
 *    purely isolated to this module.
 * 2. ONLY import `AvaPageTypes` if this is the migration module for the most
 *    recent version.
 * 3. Once this module no longer represents the most recent version, remove
 *    the `AvaPageTypes` import and manually write out the types.
 *
 * Reasoning:
 * - We want to keep a statically readable history of each version's types so
 *   different versions can be individually referenced and tested.
 * - Avoid long import chains of legacy code.
 * - We want to allow the most current AvaPage types to change freely without
 *   raising type errors in tests or migration code for older versions.
 */
import type {
  V1_AvaPageData,
  V1_AvaPageRootProps,
  V1_PBlockPropsRegistry,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV1/AvaPageDataMigrationV1.types";

export type { V1_AvaPageData, V1_AvaPageRootProps, V1_PBlockPropsRegistry };

/** V2-era curve type for line / area charts. */
type V2_CurveType = "linear" | "natural" | "monotone" | "step";

/** V2-era viz configs. Each is a single-series shape. */
export type V2_TableVizConfig = { vizType: "table" };
export type V2_BarChartVizConfig = {
  vizType: "bar";
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
  withLegend: boolean;
  color?: string;
};
export type V2_LineChartVizConfig = {
  vizType: "line";
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
  withLegend: boolean;
  curveType: V2_CurveType;
  color?: string;
};
export type V2_AreaChartVizConfig = {
  vizType: "area";
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
  withLegend: boolean;
  curveType: V2_CurveType;
  color?: string;
};
export type V2_ScatterPlotVizConfig = {
  vizType: "scatter";
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
};
export type V2_PieChartVizConfig = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};
export type V2_FunnelChartVizConfig = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};
export type V2_RadarChartVizConfig = {
  vizType: "radar";
  nameKey: string | undefined;
  valueKey: string | undefined;
  color?: string;
};
export type V2_BubbleChartVizConfig = {
  vizType: "bubble";
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
  sizeKey: string | undefined;
};

export type V2_VizConfig =
  | V2_TableVizConfig
  | V2_BarChartVizConfig
  | V2_LineChartVizConfig
  | V2_AreaChartVizConfig
  | V2_ScatterPlotVizConfig
  | V2_PieChartVizConfig
  | V2_FunnelChartVizConfig
  | V2_RadarChartVizConfig
  | V2_BubbleChartVizConfig;

export type V2_VizType = V2_VizConfig["vizType"];

type V2_NLQuery = {
  prompt: string;
  rawSql: string;
  generations: ReadonlyArray<
    | { prompt: string; rawSql: string; error?: undefined }
    | { prompt: string; rawSql: undefined; error: string }
  >;
};

export type V2_AvaPageRootProps = Omit<V1_AvaPageRootProps, "schemaVersion"> & {
  schemaVersion: 2;
};

export type V2_PBlockPropsRegistry = Omit<V1_PBlockPropsRegistry, "DataViz"> & {
  DataViz: {
    nlQuery: V2_NLQuery;
    vizType: V2_VizType;
    vizConfig: V2_VizConfig;
  };
};

export type V2_AvaPageData = {
  root: {
    props?: V2_AvaPageRootProps;
  };
  content: Array<
    {
      [K in keyof V2_PBlockPropsRegistry]: {
        type: K;
        props: { id: string } & V2_PBlockPropsRegistry[K];
      };
    }[keyof V2_PBlockPropsRegistry]
  >;
};
