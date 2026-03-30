import { QueryColumns } from "$/models/queries/QueryColumn/QueryColumns.ts";
import type {
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
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
 * True when structured `hydrateFromQuery` cannot reliably drive axes: raw
 * SQL path, no structured columns, axis keys missing from the result, or no
 * overlap between structured derived column names and result names.
 *
 * **2B:** When all primary axis keys are set and each name still appears in
 * the result, returns false so we do not re-invoke result hydration on every
 * refetch (manual axis choices preserved across identical schemas).
 *
 * Table viz returns false (no axis keys to infer here).
 */
export function shouldHydrateVizFromQueryResult(options: Options): boolean {
  const { rawSQL, query, vizConfig, resultColumnNames } = options;

  if (vizConfig.vizType === "table") {
    return false;
  }

  const { key1, key2 } = _getPrimaryAxisKeys(vizConfig);

  if (
    key1 !== undefined &&
    key2 !== undefined &&
    resultColumnNames.has(key1) &&
    resultColumnNames.has(key2)
  ) {
    return false;
  }

  if (rawSQL !== undefined && rawSQL.trim() !== "") {
    return true;
  }

  if (query.queryColumns.length === 0) {
    return true;
  }

  if (key1 !== undefined && !resultColumnNames.has(key1)) {
    return true;
  }

  if (key2 !== undefined && !resultColumnNames.has(key2)) {
    return true;
  }

  const derivedNames = query.queryColumns.map(
    QueryColumns.getDerivedColumnName,
  );
  const anyDerivedAppearsInResult = derivedNames.some((name) => {
    return resultColumnNames.has(name);
  });

  if (!anyDerivedAppearsInResult && resultColumnNames.size > 0) {
    return true;
  }

  return false;
}

/**
 * Returns the two "primary" axis keys for a given viz config.
 * - Pie-like (pie, funnel, radar): nameKey + valueKey
 * - All others: xAxisKey + yAxisKey
 */
function _getPrimaryAxisKeys(vizConfig: VizConfig): {
  key1: string | undefined;
  key2: string | undefined;
} {
  const vt = vizConfig.vizType;

  if (vt === "pie" || vt === "funnel" || vt === "radar") {
    const pv = vizConfig as {
      nameKey: string | undefined;
      valueKey: string | undefined;
    };
    return { key1: pv.nameKey, key2: pv.valueKey };
  }

  const xy = vizConfig as {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  };
  return { key1: xy.xAxisKey, key2: xy.yAxisKey };
}
