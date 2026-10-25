import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

type XYAxesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  yAxisKey: QueryColumn.Id | undefined;
};

/**
 * Seeds unconfigured slots from column IDs and preserves existing selections
 * and styles, including identities absent from the current result.
 */
export function hydrateXYFromQuery<VConfig extends XYAxesConfig>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const yAxisKey =
    currVizConfig.yAxisKey ??
    query.queryColumns.find(QueryColumn.isNumeric)?.id;
  const xAxisKey =
    currVizConfig.xAxisKey ??
    query.queryColumns.find((column) => {
      return column.id !== yAxisKey;
    })?.id;
  return { ...currVizConfig, xAxisKey, yAxisKey };
}
