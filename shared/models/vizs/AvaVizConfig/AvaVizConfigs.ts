import { registry } from "@avandar/utils";
import { AvaAreaChartVizConfigs } from "$/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfigs.ts";
import { AvaBarChartVizConfigs } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfigs.ts";
import { AvaBubbleChartVizConfigs } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfigs.ts";
import { AvaFunnelChartVizConfigs } from "$/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfigs.ts";
import { AvaLineChartVizConfigs } from "$/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfigs.ts";
import { AvaPieChartVizConfigs } from "$/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfigs.ts";
import { AvaRadarChartVizConfigs } from "$/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfigs.ts";
import { AvaScatterPlotVizConfigs } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfigs.ts";
import { AvaTableVizConfigs } from "$/models/vizs/AvaTableVizConfig/AvaTableVizConfigs.ts";
import {
  AvaVizConfig,
  AvaVizConfigType,
  AvaVizConfigUtilRegistry,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { IAvaVizConfigModule } from "$/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts";

const AvaVizConfigModulesRegistry = {
  table: AvaTableVizConfigs,
  bar: AvaBarChartVizConfigs,
  line: AvaLineChartVizConfigs,
  area: AvaAreaChartVizConfigs,
  scatter: AvaScatterPlotVizConfigs,
  pie: AvaPieChartVizConfigs,
  funnel: AvaFunnelChartVizConfigs,
  radar: AvaRadarChartVizConfigs,
  bubble: AvaBubbleChartVizConfigs,
} as const satisfies AvaVizConfigUtilRegistry;

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

/**
 * Looks up the `IAvaVizConfigModule` for a viz type, so each `AvaVizConfigs`
 * method can dispatch to that type's implementation.
 */
function _getVizTypeModule<VType extends VizType>(
  type: VType,
): IAvaVizConfigModule<VType, AvaVizConfigType<VType>> {
  return AvaVizConfigModulesRegistry[type] as unknown as IAvaVizConfigModule<
    VType,
    AvaVizConfigType<VType>
  >;
}

export const AvaVizConfigs = {
  /**
   * Get the descriptor registry for a viz type. Used by the
   * settings form to render chart-level controls and to look up
   * series-level controls (including from foreign viz types when a
   * series's `renderAs` differs from the host).
   */
  getDescriptors: <VType extends VizType>(
    type: VType,
  ): IAvaVizConfigModule<VType, AvaVizConfigType<VType>>["descriptors"] => {
    return _getVizTypeModule(type).descriptors;
  },

  makeEmptyConfig: <VType extends VizType>(
    type: VType,
  ): AvaVizConfigType<VType> => {
    return _getVizTypeModule(type).makeEmptyConfig();
  },

  /**
   * Converts a viz config to another viz type, keeping as many of its columns
   * and settings as the new type can hold. Use it when a chart's type
   * changes, for example when the user picks a new type for a chart.
   * @param currentConfig The current viz config
   * @param newVizType The viz type we are converting to
   * @returns The new viz config
   */
  convertVizConfig: <NewVType extends VizType>(
    currentConfig: AvaVizConfig,
    newVizType: NewVType,
  ): AvaVizConfigType<NewVType> => {
    const vizUtils = _getVizTypeModule(currentConfig.vizType);
    return vizUtils.convertVizConfig(currentConfig, newVizType);
  },

  /**
   * Fills a viz config's empty slots with columns picked from a structured
   * query, keeping every slot already set. Use it when the structured query
   * changes, for example when the user changes a column's aggregation.
   * @param vizConfig The viz config
   * @param query The query to hydrate values from
   * @returns The new viz config
   */
  hydrateFromQuery: <VType extends VizType>(
    vizConfig: AvaVizConfigType<VType>,
    query: PartialStructuredQuery,
  ): AvaVizConfigType<VType> => {
    const vizUtils = _getVizTypeModule(vizConfig.vizType as VType);
    return vizUtils.hydrateFromQuery(vizConfig, query);
  },

  /**
   * Fills a viz config's empty slots from a query result's columns, keeping
   * every slot already set. Use it once a result arrives, for example from
   * raw SQL, where there is no structured query to seed from.
   * @param vizConfig The viz config
   * @param columns Columns from the executed query result
   * @returns The updated viz config
   */
  hydrateFromQueryResult: <VType extends VizType>(
    vizConfig: AvaVizConfigType<VType>,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaVizConfigType<VType> => {
    const vizUtils = _getVizTypeModule(vizConfig.vizType as VType);
    return vizUtils.hydrateFromQueryResult(vizConfig, columns);
  },
};
