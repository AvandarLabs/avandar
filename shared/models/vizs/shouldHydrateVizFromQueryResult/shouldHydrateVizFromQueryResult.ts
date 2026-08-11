import { isDefined, prop } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { match } from "ts-pattern";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types.ts";

type Options = {
  rawSql: string | undefined;
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
 * When every primary key already appears in the result, returns false
 * so we do not re-invoke result hydration on every refetch (manual
 * axis choices preserved across identical schemas).
 *
 * Table viz returns false (no axis keys to infer here).
 */
export function shouldHydrateVizFromQueryResult(options: Options): boolean {
  const { rawSql, query, vizConfig, resultColumnNames } = options;

  if (vizConfig.vizType === "table") {
    return false;
  }

  const keys = _getKeysToValidate(vizConfig);

  // Short-circuit only when the config is *complete* (all minimum-required
  // axis/series slots filled) AND every existing key resolves in the result.
  // Without the completeness gate, an incomplete config like
  // `{ xAxisKey: "Admin2", series: [] }` for a bar chart would skip
  // hydration, leaving the chart with no Y series and nothing to render,
  // because the single existing key happens to be valid.
  if (
    _hasMinimumRequiredKeys(vizConfig) &&
    keys.length > 0 &&
    keys.every((k) => {
      return resultColumnNames.has(k);
    })
  ) {
    return false;
  }

  if (rawSql !== undefined && rawSql.trim() !== "") {
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
 * Returns true when `vizConfig` has every axis/series slot its viz type
 * needs to render. Anything missing here means the chart cannot render
 * meaningfully even if its currently-set keys all resolve in the result
 * (e.g. a bar chart with an X axis but no series), so callers should
 * re-hydrate from the result columns instead of preserving the config.
 */
function _hasMinimumRequiredKeys(vizConfig: VizConfig): boolean {
  return match(vizConfig)
    .with({ vizType: "table" }, () => {
      return true;
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (config) => {
      return config.nameKey !== undefined && config.valueKey !== undefined;
    })
    .with({ vizType: "radar" }, (config) => {
      return config.nameKey !== undefined && config.series.length > 0;
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (config) => {
        return config.xAxisKey !== undefined && config.series.length > 0;
      },
    )
    .with({ vizType: "scatter" }, { vizType: "bubble" }, (config) => {
      return config.series.length > 0;
    })
    .exhaustive();
}

/**
 * Returns the list of column keys that drive each viz type's primary
 * data binding. For series-array hosts (bar / line / area / radar) the
 * x or name axis plus every series key is included.
 */
function _getKeysToValidate(vizConfig: VizConfig): string[] {
  return match(vizConfig)
    .with({ vizType: "table" }, () => {
      return [];
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (config) => {
      return [config.nameKey, config.valueKey].filter(isDefined);
    })
    .with({ vizType: "radar" }, (config) => {
      return [config.nameKey, ...config.series.map(prop("key"))].filter(
        isDefined,
      );
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (config) => {
        return [config.xAxisKey, ...config.series.map(prop("key"))].filter(
          isDefined,
        );
      },
    )
    .with({ vizType: "scatter" }, (config) => {
      return config.series.flatMap((entry) => {
        return [entry.xKey, entry.key];
      });
    })
    .with({ vizType: "bubble" }, (config) => {
      return config.series.flatMap((entry) => {
        return [entry.xKey, entry.key, entry.sizeKey];
      });
    })
    .exhaustive();
}
