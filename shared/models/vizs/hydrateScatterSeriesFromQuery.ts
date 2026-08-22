import { isNonEmptyArray } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig.ts";

type ScatterSeriesConfig = {
  series: readonly ScatterSeries[];
};

/**
 * Reconcile a scatter config against the current structured query's columns.
 * Series whose `xKey` or `key` are no longer in the query are dropped.
 * When the series array is empty, seeds one series from the first two numeric
 * columns (or same column for both if only one numeric is available).
 *
 * @param currVizConfig Current scatter viz config.
 * @param query The structured query to hydrate from.
 * @returns Updated config with stale series pruned and defaults seeded.
 */
export function hydrateScatterSeriesFromQuery<
  VConfig extends ScatterSeriesConfig,
>(currVizConfig: VConfig, query: PartialStructuredQuery): VConfig {
  const { queryColumns } = query;
  const columnNames = new Set(
    queryColumns.map((c) => {
      return QueryColumn.getDerivedColumnName(c);
    }),
  );

  let nextSeries: ScatterSeries[] = currVizConfig.series.filter((s) => {
    return columnNames.has(s.xKey) && columnNames.has(s.key);
  });

  if (nextSeries.length === 0 && isNonEmptyArray(queryColumns)) {
    const numerics = queryColumns.filter(QueryColumn.isNumeric);
    if (numerics.length >= 2) {
      nextSeries = [
        {
          xKey: QueryColumn.getDerivedColumnName(numerics[0]!),
          key: QueryColumn.getDerivedColumnName(numerics[1]!),
        },
      ];
    } else if (numerics.length === 1) {
      const only = QueryColumn.getDerivedColumnName(numerics[0]!);
      nextSeries = [{ xKey: only, key: only }];
    }
  }

  return { ...currVizConfig, series: nextSeries };
}
