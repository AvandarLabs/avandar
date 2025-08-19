import { match } from "ts-pattern";
import { BarChartSettings } from "./BarChartForm";
import { LineChartSettings } from "./LineChartForm";

// add "line" to the union
export type VizType = "table" | "bar" | "line";

export type VizConfig =
  | { type: "table"; settings: undefined }
  | { type: "bar"; settings: BarChartSettings }
  | { type: "line"; settings: LineChartSettings };

export function makeDefaultVizConfig(vizType: VizType): VizConfig {
  return match(vizType)
    .with("table", (type) => {
      return { type, settings: undefined };
    })
    .with("bar", (type) => {
      return {
        type,
        settings: { xAxisKey: undefined, yAxisKey: undefined },
      };
    })
    .with("line", (type) => {
      return {
        type,
        settings: { xAxisKey: undefined, yAxisKey: undefined },
      };
    })
    .exhaustive();
}
