import { QueryColumns } from "$/models/queries/QueryColumn/QueryColumns.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

type Options = {
  rawSQL: string | undefined;
  query: PartialStructuredQuery;
  vizConfig: VizConfig;
  /** Column `name` values from the current `QueryResult`. */
  resultColumnNames: ReadonlySet<string>;
};

/**
 * Whether the app should run `hydrateFromQueryResult` for the current viz.
 *
 * True when structured `hydrateFromQuery` cannot reliably drive XY axes: raw
 * SQL path, no structured columns, axis keys missing from the result, or no
 * overlap between structured derived column names and result names.
 *
 * Table viz returns false (no XY axes to infer here).
 */
export function shouldHydrateVizFromQueryResult(options: Options): boolean {
  const { rawSQL, query, vizConfig, resultColumnNames } = options;

  if (vizConfig.vizType === "table") {
    return false;
  }

  if (rawSQL !== undefined && rawSQL.trim() !== "") {
    return true;
  }

  if (query.queryColumns.length === 0) {
    return true;
  }

  const xy = vizConfig as {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  };

  if (xy.xAxisKey !== undefined && !resultColumnNames.has(xy.xAxisKey)) {
    return true;
  }

  if (xy.yAxisKey !== undefined && !resultColumnNames.has(xy.yAxisKey)) {
    return true;
  }

  const derivedNames = query.queryColumns.map(QueryColumns.getDerivedColumnName);
  const anyDerivedAppearsInResult = derivedNames.some((name) => {
    return resultColumnNames.has(name);
  });

  if (!anyDerivedAppearsInResult && resultColumnNames.size > 0) {
    return true;
  }

  return false;
}
