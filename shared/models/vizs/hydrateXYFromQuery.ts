import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

type XYAxesConfig = {
  xAxisKey: QueryColumn.Id | undefined;
  yAxisKey: QueryColumn.Id | undefined;
};

/**
 * Fills the empty axis slots of a config with one X and one Y column from a
 * structured query's columns: the first numeric column for Y and another
 * column for X. Set slots keep their column ID, even when the query no longer
 * selects that column.
 *
 * Use it so such a chart has something to draw before the user assigns its
 * columns, for example after the query's selected columns change.
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
