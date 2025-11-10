import { TableVizConfig } from "../TableVizConfig";
import { BarChartVizConfig } from "../BarChartVizConfig";
import { LineChartVizConfig } from "../LineChartVizConfig";
import { ScatterPlotVizConfig } from "../ScatterPlotVizConfig";
import { ObjectRegistry } from "@/lib/types/utilityTypes";
import { IVizConfigModule } from "./IVizConfigModule";

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
