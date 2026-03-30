import { registry } from "@utils/objects/registry/registry.ts";
import {
  AreaChartVizConfigs,
} from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfigs.ts";
import {
  BarChartVizConfigs,
} from "$/models/vizs/BarChartVizConfig/BarChartVizConfigs.ts";
import {
  BubbleChartVizConfigs,
} from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfigs.ts";
import {
  FunnelChartVizConfigs,
} from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfigs.ts";
import {
  LineChartVizConfigs,
} from "$/models/vizs/LineChartVizConfig/LineChartVizConfigs.ts";
import {
  PieChartVizConfigs,
} from "$/models/vizs/PieChartVizConfig/PieChartVizConfigs.ts";
import {
  RadarChartVizConfigs,
} from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfigs.ts";
import {
  ScatterPlotVizConfigs,
} from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfigs.ts";
import {
  TableVizConfigs,
} from "$/models/vizs/TableVizConfig/TableVizConfigs.ts";
import {
  VizConfig,
  VizConfigType,
  VizConfigUtilRegistry,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types.ts";
import type { IVizConfigModule } from "$/models/vizs/VizConfig/IVizConfigModule.ts";
import type {
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type {
  QueryResultColumn,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

const VizConfigModulesRegistry = {
  table: TableVizConfigs,
  bar: BarChartVizConfigs,
  line: LineChartVizConfigs,
  area: AreaChartVizConfigs,
  scatter: ScatterPlotVizConfigs,
  pie: PieChartVizConfigs,
  funnel: FunnelChartVizConfigs,
  radar: RadarChartVizConfigs,
  bubble: BubbleChartVizConfigs,
} as const satisfies VizConfigUtilRegistry;

export const VizTypes = registry<VizType>().keys(
  "table",
  "bar",
  "line",
  "area",
  "scatter",
  "pie",
  "funnel",
  "radar",
  "bubble",
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

  /**
   * Hydrate a viz config from query result column metadata.
   * @param vizConfig The viz config
   * @param columns Columns from the executed query result
   * @returns The updated viz config
   */
  hydrateFromQueryResult: <VType extends VizType>(
    vizConfig: VizConfigType<VType>,
    columns: readonly QueryResultColumn[],
  ): VizConfigType<VType> => {
    const vizUtils = _getVizTypeModule(vizConfig.vizType as VType);
    return vizUtils.hydrateFromQueryResult(vizConfig, columns);
  },
};
