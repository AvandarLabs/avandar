import type { AvaAreaChartVizConfig } from "$/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfig.types.ts";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts";
import type { AvaBubbleChartVizConfig } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfig.types.ts";
import type { AvaFunnelChartVizConfig } from "$/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfig.types.ts";
import type { AvaLineChartVizConfig } from "$/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfig.types.ts";
import type { AvaPieChartVizConfig } from "$/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfig.types.ts";
import type { AvaPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
import type { AvaRadarChartVizConfig } from "$/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfig.types.ts";
import type { AvaScatterPlotVizConfig } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfig.types.ts";
import type { AvaTableVizConfig } from "$/models/vizs/AvaTableVizConfig/AvaTableVizConfig.types.ts";
import type { IAvaVizConfigModule } from "$/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts";
import type { ObjectRegistry } from "@avandar/utils";

/** The configs of the chart and table types Avandar draws itself. */
export type BuiltInAvaVizConfig =
  | AvaTableVizConfig
  | AvaBarChartVizConfig
  | AvaLineChartVizConfig
  | AvaAreaChartVizConfig
  | AvaScatterPlotVizConfig
  | AvaPieChartVizConfig
  | AvaFunnelChartVizConfig
  | AvaRadarChartVizConfig
  | AvaBubbleChartVizConfig;

/** Every chart config: a chart or table Avandar draws, or a plugin chart. */
export type AvaVizConfig = BuiltInAvaVizConfig | AvaPluginVizConfig;

/** The viz types of the charts and table Avandar draws itself. */
export type BuiltInVizType = BuiltInAvaVizConfig["vizType"];
export type VizType = AvaVizConfig["vizType"];
export type AvaVizConfigRegistry = ObjectRegistry<AvaVizConfig, "vizType">;
export type AvaVizConfigType<K extends VizType> = AvaVizConfigRegistry[K];

export type AvaVizConfigUtilRegistry = {
  [K in BuiltInVizType]: IAvaVizConfigModule<K, AvaVizConfigType<K>>;
};
