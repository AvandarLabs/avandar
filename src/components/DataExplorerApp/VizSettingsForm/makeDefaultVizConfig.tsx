import { match } from "ts-pattern";
import { BarChartSettings } from "./BarChartForm";
import { LineChartSettings } from "./LineChartForm";
import { ScatterChartSettings } from "./ScatterChartForm";

export type VizType = "table" | "bar" | "line" | "scatter";

export type TableVizConfig = {
  type: "table";
  settings: undefined;
};

export type BarVizConfig = {
  type: "bar";
  settings: BarChartSettings;
};

export type LineVizConfig = {
  type: "line";
  settings: LineChartSettings;
};

export type ScatterVizConfig = {
  type: "scatter";
  settings: ScatterChartSettings;
};

export type VizConfig =
  | TableVizConfig
  | BarVizConfig
  | LineVizConfig
  | ScatterVizConfig;

export function makeDefaultVizConfig(vizType: VizType): VizConfig {
  return match(vizType)
    .with("table", (type): TableVizConfig => {
      return { type, settings: undefined };
    })
    .with("bar", (type): BarVizConfig => {
      return { type, settings: { xAxisKey: undefined, yAxisKey: undefined } };
    })
    .with("line", (type): LineVizConfig => {
      return { type, settings: { xAxisKey: undefined, yAxisKey: undefined } };
    })
    .with("scatter", (type): ScatterVizConfig => {
      return { type, settings: { xAxisKey: undefined, yAxisKey: undefined } };
    })
    .exhaustive();
}
