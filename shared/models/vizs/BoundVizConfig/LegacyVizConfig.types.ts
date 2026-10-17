/** Frozen row-key chart shapes for legacy ingress and renderer output. */
export type LegacyVizConfig =
  | { vizType: "table" }
  | {
      vizType: "bar";
      xAxisKey: string | undefined;
      series: LegacyXYSeries[];
      layout: "group" | "stack" | "percent";
      withLegend: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "line";
      xAxisKey: string | undefined;
      series: LegacyXYSeries[];
      withLegend: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "area";
      xAxisKey: string | undefined;
      series: LegacyXYSeries[];
      layout: "default" | "stacked" | "percent" | "split";
      withLegend: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "scatter";
      series: LegacyScatterSeries[];
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "bubble";
      series: LegacyBubbleSeries[];
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "radar";
      nameKey: string | undefined;
      series: LegacyRadarSeries[];
      withLegend?: boolean;
      chartStyle?: LegacyChartStyle;
    }
  | {
      vizType: "pie";
      nameKey: string | undefined;
      valueKey: string | undefined;
      isDonut: boolean;
      withLabels: boolean;
      labelsType: "value" | "percent";
      seriesColors?: Record<string, string>;
    }
  | {
      vizType: "funnel";
      nameKey: string | undefined;
      valueKey: string | undefined;
      seriesColors?: Record<string, string>;
    };

/** Frozen mark settings for mixed XY charts. */
export type LegacyXYSeries =
  | {
      renderAs: "bar";
      key: string;
      label?: string;
      color?: string;
      fillOpacity?: number;
      stackId?: string;
    }
  | {
      renderAs: "line";
      key: string;
      label?: string;
      color?: string;
      curveType?: "linear" | "natural" | "monotone" | "step";
      strokeWidth?: number;
      withDots?: boolean;
    }
  | {
      renderAs: "area";
      key: string;
      label?: string;
      color?: string;
      curveType?: "linear" | "natural" | "monotone" | "step";
      strokeWidth?: number;
      fillOpacity?: number;
      withDots?: boolean;
    };

/** Frozen scatter cloud settings. */
export type LegacyScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

/** Frozen bubble cloud settings. */
export type LegacyBubbleSeries = LegacyScatterSeries & { sizeKey: string };

/** Frozen radar polygon settings. */
export type LegacyRadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Frozen canvas settings, containing no column bindings. */
export type LegacyChartStyle = {
  xAxis?: LegacyAxisStyle;
  yAxis?: LegacyAxisStyle;
  grid?: { color?: string; horizontal?: boolean; vertical?: boolean };
  legend?: { position?: "top" | "bottom" | "left" | "right" };
};

/** Frozen axis presentation settings. */
export type LegacyAxisStyle = {
  label?: string;
  labelColor?: string;
  tickColor?: string;
  hide?: boolean;
  min?: number;
  max?: number;
  tickInterval?: number;
  tickAngle?: number;
};

/** Row-key output produced exclusively at the renderer boundary. */
export type ResolvedVizConfig = LegacyVizConfig;
