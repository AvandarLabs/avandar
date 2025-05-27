import { match } from "ts-pattern";
import { VizType } from ".";
import { BarChartSettings } from "./BarChartForm";

export type VizConfig =
  | {
      type: "table";
      settings: undefined;
    }
  | {
      type: "bar";
      settings: BarChartSettings;
    };

export function makeDefaultVizConfig(vizType: VizType): VizConfig {
  return match(vizType)
    .with("table", (type) => {
      return {
        type,
        settings: undefined,
      };
    })
    .with("bar", (type) => {
      return {
        type,
        settings: {
          xAxisKey: undefined,
          yAxisKey: undefined,
        },
      };
    })
    .exhaustive();
}
