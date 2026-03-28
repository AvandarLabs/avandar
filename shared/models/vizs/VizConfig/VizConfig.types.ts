import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts";
import type { TableVizConfig } from "$/models/vizs/TableVizConfig/TableVizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type { ObjectRegistry } from "@utils/types/utilities.types.ts";

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
