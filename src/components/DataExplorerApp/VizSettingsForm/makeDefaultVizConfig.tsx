import { match } from "ts-pattern";
import { BarChartSettings } from "./BarChartForm";
import { LineChartSettings } from "./LineChartForm";

export type VizType = "table" | "bar" | "line";

export type VizConfigBase = {
  cachedXY?: { xAxisKey?: string; yAxisKey?: string };
};

export type VizConfig =
  | ({ type: "table"; settings: undefined } & VizConfigBase)
  | ({ type: "bar"; settings: BarChartSettings } & VizConfigBase)
  | ({ type: "line"; settings: LineChartSettings } & VizConfigBase);

export type LineVizConfig = {
  type: "line";
  settings: LineChartSettings;
};

export function makeDefaultVizConfig(vizType: VizType): VizConfig {
  return match(vizType)
    .with("table", (type) => {
      return { type, settings: undefined, cachedXY: undefined };
    })
    .with("bar", (type) => {
      return {
        type,
        settings: { xAxisKey: undefined, yAxisKey: undefined },
        yAxisKey: undefined,
      };
    })
    .with("line", (type) => {
      return {
        type,
        settings: { xAxisKey: undefined, yAxisKey: undefined },
        cachedXY: undefined,
      };
    })
    .exhaustive();
}
