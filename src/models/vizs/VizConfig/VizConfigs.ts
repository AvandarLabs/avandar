import {
  VizConfig,
  VizConfigType,
  VizConfigUtilRegistry,
  VizType,
} from "./VizConfig.types";
import { BarChartVizConfigs } from "../BarChartVizConfig";
import { LineChartVizConfigs } from "../LineChartVizConfig";
import { ScatterPlotVizConfigs } from "../ScatterPlotVizConfig";
import { TableVizConfigs } from "../TableVizConfig/TableVizConfigs";
import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";
import { IVizConfigModule } from "./IVizConfigModule";
import { registryKeys } from "@/lib/utils/objects/misc";

const VizConfigModulesRegistry = {
  "table": TableVizConfigs,
  "bar": BarChartVizConfigs,
  "line": LineChartVizConfigs,
  "scatter": ScatterPlotVizConfigs,
} as const satisfies VizConfigUtilRegistry;

export const VizTypes = registryKeys<VizType>(VizConfigModulesRegistry);

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
  getDisplayName: <VType extends VizType>(
    type: VType,
  ): string => {
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
    const vizUtils = _getVizTypeModule(
      currentConfig.vizType,
    );
    return vizUtils.convertVizConfig(
      currentConfig,
      newVizType,
    );
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
    const vizUtils = _getVizTypeModule(
      vizConfig.vizType as VType,
    );
    return vizUtils.hydrateFromQuery(vizConfig, query);
  },
};
