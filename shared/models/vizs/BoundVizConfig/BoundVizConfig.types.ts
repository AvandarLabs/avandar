import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { LegacyChartStyle } from "$/models/vizs/BoundVizConfig/LegacyVizConfig.types.ts";

/** Stable column bindings for each supported chart variant. */
export type BoundVizConfig =
  | { vizType: "table" }
  | {
      vizType: "bar";
      xAxisKey: QueryColumn.Id | undefined;
      series: BoundXYSeries[];
      layout: "group" | "stack" | "percent";
      withLegend: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "line";
      xAxisKey: QueryColumn.Id | undefined;
      series: BoundXYSeries[];
      withLegend: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "area";
      xAxisKey: QueryColumn.Id | undefined;
      series: BoundXYSeries[];
      layout: "default" | "stacked" | "percent" | "split";
      withLegend: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "scatter";
      series: BoundScatterSeries[];
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "bubble";
      series: BoundBubbleSeries[];
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "radar";
      nameKey: QueryColumn.Id | undefined;
      series: BoundRadarSeries[];
      withLegend?: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "pie";
      nameKey: QueryColumn.Id | undefined;
      valueKey: QueryColumn.Id | undefined;
      isDonut: boolean;
      withLabels: boolean;
      labelsType: "value" | "percent";
      seriesColors?: Record<string, string>;
    }
  | {
      vizType: "funnel";
      nameKey: QueryColumn.Id | undefined;
      valueKey: QueryColumn.Id | undefined;
      seriesColors?: Record<string, string>;
    };

/** Bound mark settings for mixed XY charts. */
export type BoundXYSeries =
  | {
      renderAs: "bar";
      key: QueryColumn.Id;
      label?: string;
      color?: string;
      fillOpacity?: number;
      stackId?: string;
    }
  | {
      renderAs: "line";
      key: QueryColumn.Id;
      label?: string;
      color?: string;
      curveType?: "linear" | "natural" | "monotone" | "step";
      strokeWidth?: number;
      withDots?: boolean;
    }
  | {
      renderAs: "area";
      key: QueryColumn.Id;
      label?: string;
      color?: string;
      curveType?: "linear" | "natural" | "monotone" | "step";
      strokeWidth?: number;
      fillOpacity?: number;
      withDots?: boolean;
    };

/** Bound scatter cloud settings. */
export type BoundScatterSeries = {
  key: QueryColumn.Id;
  xKey: QueryColumn.Id;
  label?: string;
  color?: string;
};

/** Bound bubble cloud settings. */
export type BoundBubbleSeries = BoundScatterSeries & {
  sizeKey: QueryColumn.Id;
};

/** Bound radar polygon settings. */
export type BoundRadarSeries = {
  key: QueryColumn.Id;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};
