import { registry } from "@avandar/utils";
import { BarChartVizConfigs } from "../BarChartVizConfig/BarChartVizConfigs.ts";
import { LineChartVizConfigs } from "../LineChartVizConfig/LineChartVizConfigs.ts";
import { ScatterPlotVizConfigs } from "../ScatterPlotVizConfig/ScatterPlotVizConfigs.ts";
import { TableVizConfigs } from "../TableVizConfig/TableVizConfigs.ts";
import {
  VizConfig,
  VizConfigType,
  VizConfigUtilRegistry,
  VizType,
} from "./VizConfig.types.ts";
import type { IVizConfigModule } from "./IVizConfigModule.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

const VizConfigModulesRegistry = {
  table: TableVizConfigs,
  bar: BarChartVizConfigs,
  line: LineChartVizConfigs,
  scatter: ScatterPlotVizConfigs,
} as const satisfies VizConfigUtilRegistry;

export const VizTypes = registry<VizType>().keys(
  "table",
  "bar",
  "line",
  "scatter",
);

/** Get the specific utils module for a given viz type.*/
function _getVizTypeModule<VType extends VizType>(
  type: VType,
): IVizConfigModule<VType, VizConfigType<VType>> {
  return VizConfigModulesRegistry[type] as unknown as IVizConfigModule<
    VType,
    VizConfigType<VType>
  >;
}

export const VizConfigs = {
  getDisplayName: <VType extends VizType>(type: VType): string => {
    return _getVizTypeModule(type).displayName;
  },

  makeEmptyConfig: <VType extends VizType>(
    type: VType,
  ): VizConfigType<VType> => {
    return _getVizTypeModule(type).makeEmptyConfig();
  },

  /**
   * Convert a viz config from one type to another.
   * @param currentConfig The current viz config
   * @param newVizType The viz type we are converting to
   * @returns The new viz config
   */
  convertVizConfig: <NewVType extends VizType>(
    currentConfig: VizConfig,
    newVizType: NewVType,
  ): VizConfigType<NewVType> => {
    const vizUtils = _getVizTypeModule(currentConfig.vizType);
    return vizUtils.convertVizConfig(currentConfig, newVizType);
  },

  /**
   * Hydrate a viz config from a query. This will populate, if possible, any
   * empty values with reasonable defaults from the query config.
   * @param vizConfig The viz config
   * @param query The query to hydrate values from
   * @returns The new viz config
   */
  hydrateFromQuery: <VType extends VizType>(
    vizConfig: VizConfigType<VType>,
    query: PartialStructuredQuery,
  ): VizConfigType<VType> => {
    const vizUtils = _getVizTypeModule(vizConfig.vizType as VType);
    return vizUtils.hydrateFromQuery(vizConfig, query);
  },
};
