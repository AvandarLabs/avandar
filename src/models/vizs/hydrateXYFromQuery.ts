import { isNonEmptyArray } from "@/lib/utils/guards/guards";
import { PartialStructuredQuery } from "../queries/StructuredQuery";
import { QueryColumns } from "../queries/QueryColumn";

type XYAxesConfig = {
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
};

/**
 * Hydrate the X and Y axes of a viz config from a query.
 * @param currVizConfig The current viz config to hydrate.
 * @param query The query to hydrate the axes from.
 * @returns The new viz config with the axes hydrated.
 */
export function hydrateXYFromQuery<
  VConfig extends XYAxesConfig,
>(
  currVizConfig: VConfig,
  query: PartialStructuredQuery,
): VConfig {
  const prevXAxisKey = currVizConfig.xAxisKey;
  const prevYAxisKey = currVizConfig.yAxisKey;
  // first let's check if the current x and y axes still exist in the query
  // columns
  const isXAXisStillValid = query.queryColumns.some((col) => {
    // TODO(jpsyx): this will change when we compare columns by their IDs
    // instead of their derived names
    return QueryColumns.getDerivedColumnName(col) === prevXAxisKey;
  });
  const isYAxisStillValid = query.queryColumns.some((col) => {
    // TODO(jpsyx): see note above for the X axis check
    return QueryColumns.getDerivedColumnName(col) === prevYAxisKey;
  });

  // for each axis that is invalid, we clear it from the existing config
  let newVizConfig: VConfig = {
    ...currVizConfig,
    xAxisKey: isXAXisStillValid ? prevXAxisKey : undefined,
    yAxisKey: isYAxisStillValid ? prevYAxisKey : undefined,
  };
  const { xAxisKey, yAxisKey } = newVizConfig;

  if (xAxisKey === undefined || yAxisKey === undefined) {
    const { queryColumns } = query;
    // if we're missing a Y axis, choose the first numeric column available
    if (yAxisKey === undefined && isNonEmptyArray(queryColumns)) {
      const firstNumericColumn = queryColumns.find(QueryColumns.isNumeric);
      newVizConfig = {
        ...newVizConfig,
        yAxisKey: firstNumericColumn
          ? QueryColumns.getDerivedColumnName(firstNumericColumn)
          : undefined,
      };
    }

    const newYAxisKey = newVizConfig.yAxisKey;

    // if we're missing an X axis, choose the first column available that isn't
    // the Y axis
    if (xAxisKey === undefined && isNonEmptyArray(queryColumns)) {
      const firstColumn = queryColumns.find((col) => {
        return QueryColumns.getDerivedColumnName(col) !== newYAxisKey;
      });

      newVizConfig = {
        ...newVizConfig,
        xAxisKey: firstColumn
          ? QueryColumns.getDerivedColumnName(firstColumn)
          : undefined,
      };
    }
  }
  return newVizConfig;
}
