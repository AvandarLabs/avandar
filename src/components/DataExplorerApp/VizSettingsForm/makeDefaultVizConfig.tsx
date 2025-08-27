import { match } from "ts-pattern";
import { BarChartSettings } from "./BarChartForm";
import { LineChartSettings } from "./LineChartForm";

export type VizType = "table" | "bar" | "line";

/**
 * XYCache
 * Persist the last chosen xAxisKey/yAxisKey across XY charts so that
 * switching between "bar" and "line" can carry over sensible defaults.
 * This is only present on XY-chart configs (NOT table or other non-XY viz).
 */
export type XYCache = { xAxisKey?: string; yAxisKey?: string };

export type TableVizConfig = {
  type: "table";
  settings: undefined;
};

export type BarVizConfig = {
  type: "bar";
  settings: BarChartSettings;
  /** See XYCache docstring above. */
  cachedXY?: XYCache;
};

export type LineVizConfig = {
  type: "line";
  settings: LineChartSettings;
  /** See XYCache docstring above. */
  cachedXY?: XYCache;
};

export type VizConfig = TableVizConfig | BarVizConfig | LineVizConfig;

export type LineVizConfig = {
  type: "line";
  settings: LineChartSettings;
};

export function makeDefaultVizConfig(vizType: VizType): VizConfig {
  return match(vizType)
    .with("table", (type): TableVizConfig => {
      return { type, settings: undefined };
    })
    .with("bar", (type): BarVizConfig => {
      return {
        type,
        settings: { xAxisKey: undefined, yAxisKey: undefined },
        cachedXY: undefined,
      };
    })
    .with("line", (type): LineVizConfig => {
      return {
        type,
        settings: { xAxisKey: undefined, yAxisKey: undefined },
        cachedXY: undefined,
      };
    })
    .exhaustive();
}
