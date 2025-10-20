import {
  VizConfig,
  VizConfigType,
  VizConfigUtilRegistry,
  VizType,
} from "./VizConfig.types";
import { BarChartVizConfigUtils } from "../BarChartVizConfig";
import { LineChartVizConfigUtils } from "../LineChartVizConfig";
import { ScatterPlotVizConfigUtils } from "../ScatterPlotVizConfig";
import { TableVizConfigUtils } from "../TableVizConfig/TableVizConfigUtils";
import { PartialStructuredQuery } from "@/models/queries/StructuredQuery";
import { IVizConfigModule } from "./IVizConfigModule";
import { registryKeys } from "@/lib/utils/objects/misc";

const VizConfigUtilsRegistry = {
  "table": TableVizConfigUtils,
  "bar": BarChartVizConfigUtils,
  "line": LineChartVizConfigUtils,
  "scatter": ScatterPlotVizConfigUtils,
} as const satisfies VizConfigUtilRegistry;

export const VizTypes = registryKeys<VizType>(VizConfigUtilsRegistry);

export const VizConfigUtils = {
  /** Get the specific utils module for a given viz type.*/
  ofVizType: <VType extends VizType>(
    type: VType,
  ): IVizConfigModule<VType, VizConfigType<VType>> => {
    return VizConfigUtilsRegistry[type] as unknown as IVizConfigModule<
      VType,
      VizConfigType<VType>
    >;
  },

  makeEmptyConfig: <VType extends VizType>(
    type: VType,
  ): VizConfigType<VType> => {
    return VizConfigUtils.ofVizType(type).makeEmptyConfig();
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
    const vizUtils = VizConfigUtils.ofVizType(
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
    const vizUtils = VizConfigUtils.ofVizType(
      vizConfig.vizType as VType,
    );
    return vizUtils.hydrateFromQuery(vizConfig, query);
  },
};
