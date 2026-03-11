import type { BarChartVizConfig } from "../BarChartVizConfig/BarChartVizConfig.types.ts";
import type { LineChartVizConfig } from "../LineChartVizConfig/LineChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "../ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { TableVizConfig } from "../TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "./IVizConfigModule.ts";
import type { ObjectRegistry } from "@utils/types/utilityTypes.ts";

export type VizConfig =
  | TableVizConfig
  | BarChartVizConfig
  | LineChartVizConfig
  | ScatterPlotVizConfig;

export type VizType = VizConfig["vizType"];
export type VizConfigRegistry = ObjectRegistry<VizConfig, "vizType">;
export type VizConfigType<K extends VizType> = VizConfigRegistry[K];

export type VizConfigUtilRegistry = {
  [K in VizType]: IVizConfigModule<K, VizConfigType<K>>;
};
