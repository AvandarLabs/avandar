import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type {
  RadarSeries,
  XYSeries,
} from "$/models/vizs/SeriesConfig.ts";
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
 * SQL path, no structured columns, axis or series keys missing from the
 * result, or no overlap between structured derived column names and result
 * names.
 *
 * **2B:** When every primary key already appears in the result, returns
 * false so we do not re-invoke result hydration on every refetch (manual
 * axis choices preserved across identical schemas).
 *
 * Table viz returns false (no axis keys to infer here).
 */
export function shouldHydrateVizFromQueryResult(options: Options): boolean {
  const { rawSQL, query, vizConfig, resultColumnNames } = options;

  if (vizConfig.vizType === "table") {
    return false;
  }

  const keys = _getKeysToValidate(vizConfig);

  if (
    keys.length > 0 &&
    keys.every((k) => {
      return resultColumnNames.has(k);
    })
  ) {
    return false;
  }

  if (rawSQL !== undefined && rawSQL.trim() !== "") {
    return true;
  }

  if (query.queryColumns.length === 0) {
    return true;
  }

  if (
    keys.some((k) => {
      return !resultColumnNames.has(k);
    })
  ) {
    return true;
  }

  const derivedNames = query.queryColumns.map(QueryColumn.getDerivedColumnName);
  const anyDerivedAppearsInResult = derivedNames.some((name) => {
    return resultColumnNames.has(name);
  });

  if (!anyDerivedAppearsInResult && resultColumnNames.size > 0) {
    return true;
  }

  return false;
}

/**
 * Returns the list of column keys that drive each viz type's primary
 * data binding. For series-array hosts (bar / line / area / radar) the
 * x or name axis plus every series key is included.
 */
function _getKeysToValidate(vizConfig: VizConfig): string[] {
  const vt = vizConfig.vizType;

  if (vt === "pie" || vt === "funnel") {
    const pv = vizConfig as {
      nameKey: string | undefined;
      valueKey: string | undefined;
    };
    const keys: string[] = [];
    if (pv.nameKey !== undefined) {
      keys.push(pv.nameKey);
    }
    if (pv.valueKey !== undefined) {
      keys.push(pv.valueKey);
    }
    return keys;
  }

  if (vt === "radar") {
    const rv = vizConfig as {
      nameKey: string | undefined;
      series: ReadonlyArray<RadarSeries>;
    };
    const keys: string[] = [];
    if (rv.nameKey !== undefined) {
      keys.push(rv.nameKey);
    }
    for (const s of rv.series) {
      keys.push(s.key);
    }
    return keys;
  }

  if (vt === "bar" || vt === "line" || vt === "area") {
    const xy = vizConfig as {
      xAxisKey: string | undefined;
      series: ReadonlyArray<XYSeries>;
    };
    const keys: string[] = [];
    if (xy.xAxisKey !== undefined) {
      keys.push(xy.xAxisKey);
    }
    for (const s of xy.series) {
      keys.push(s.key);
    }
    return keys;
  }

  // scatter and bubble
  const xy = vizConfig as {
    xAxisKey: string | undefined;
    yAxisKey: string | undefined;
  };
  const keys: string[] = [];
  if (xy.xAxisKey !== undefined) {
    keys.push(xy.xAxisKey);
  }
  if (xy.yAxisKey !== undefined) {
    keys.push(xy.yAxisKey);
  }
  return keys;
}
